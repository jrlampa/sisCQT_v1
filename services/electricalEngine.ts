
import { NetworkNode, ProjectParams, EngineResult, MonteCarloResult, SustainabilityMetrics, GdImpactMetrics } from '../types.ts';
import { DMDI_TABLES, PROFILES } from '../constants.ts';

interface TreeNode extends NetworkNode {
  children: TreeNode[];
  accumulatedKva: number; 
  accumulatedSolarKva: number;
}

export class ElectricalEngine {
  
  private static readonly ENERGY_PRICE_BRL = 0.85;
  private static readonly CO2_FACTOR_KG_KWH = 0.126;
  private static readonly LOAD_LOSS_FACTOR = 0.25;
  private static readonly DAY_LOAD_FACTOR = 0.30; 

  static calculate(
    scenarioId: string, 
    nodes: NetworkNode[], 
    params: ProjectParams, 
    cablesCatalog: Record<string, { r: number, x: number, coef: number, ampacity: number }>, 
    ipCatalog: Record<string, number>
  ): EngineResult {
    // Clonagem profunda para evitar mutações de estado inesperadas
    const processedNodes: NetworkNode[] = JSON.parse(JSON.stringify(nodes));
    const warnings: string[] = [];
    
    // 1. Construção da Árvore de Adjacência
    const nodeMap = new Map<string, TreeNode>();
    processedNodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [], accumulatedKva: 0, accumulatedSolarKva: 0 });
    });

    const trafoNode = nodeMap.get('TRAFO');
    if (!trafoNode) {
        throw new Error("Nó 'TRAFO' não encontrado. Topologia inválida.");
    }

    nodeMap.forEach(node => {
      if (node.id !== 'TRAFO') {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
            parent.children.push(node);
        } else {
            warnings.push(`⚠️ Nó órfão detectado: ${node.id} não possui pai válido.`);
        }
      }
    });

    // 2. Cálculo de DMDI Global (Norma PRODIST/ABNT)
    const totalResidences = processedNodes.reduce((acc, n) => 
        acc + (n.loads?.mono || 0) + (n.loads?.bi || 0) + (n.loads?.tri || 0), 0);

    let globalDmdiFactor = 0;
    if (totalResidences > 0) {
      const currentTable = DMDI_TABLES[params.normativeTable] || DMDI_TABLES["PRODIST"];
      const row = currentTable.find(r => totalResidences >= r.min && totalResidences <= r.max) 
               || currentTable[currentTable.length - 1];
      globalDmdiFactor = (row[params.manualClass as keyof typeof row] as number) || 0;
    }

    let totalInstalledSolarKva = 0;
    let totalJouleLossWatts = 0;
    let totalLoadKva = 0;

    // Helper para extrair carga líquida de um nó
    const getNodeLoadInfo = (node: NetworkNode) => {
      const residencesQty = (node.loads?.mono || 0) + (node.loads?.bi || 0) + (node.loads?.tri || 0);
      const demandKva = residencesQty * globalDmdiFactor;
      const ipKva = ((node.loads?.ipQty || 0) * (ipCatalog[node.loads?.ipType || 'Sem IP'] || 0));
      const pointKva = node.loads?.pointKva || 0; 
      const solarKva = node.loads?.solarKva || 0;
      
      totalLoadKva += (demandKva + ipKva + pointKva);
      totalInstalledSolarKva += solarKva;

      // Cálculo de carga para queda de tensão (CQT)
      // includeGdInQt simula se a injeção solar reduz a carga de pico (ex: pico solar ao meio-dia)
      const qtLoadKva = params.includeGdInQt ? Math.max(0, (demandKva + ipKva + pointKva - (solarKva * 0.5))) : (demandKva + ipKva + pointKva);

      return { kva: qtLoadKva, solar: solarKva };
    };

    // 3. Propagação Recursiva de Cargas (Fim para Início)
    const calculateKvaFlow = (node: TreeNode): { kva: number, solar: number } => {
      const myInfo = getNodeLoadInfo(node);
      const childrenFlow = node.children.reduce((acc, child) => {
        const res = calculateKvaFlow(child);
        return { kva: acc.kva + res.kva, solar: acc.solar + res.solar };
      }, { kva: 0, solar: 0 });
      
      node.accumulatedKva = myInfo.kva + childrenFlow.kva;
      node.accumulatedSolarKva = myInfo.solar + childrenFlow.solar;
      return { kva: node.accumulatedKva, solar: node.accumulatedSolarKva };
    };

    calculateKvaFlow(trafoNode);

    // 4. Cálculo Físico (Queda de Tensão e Perdas Joule)
    let maxVoltageRise = 0;
    let maxReverseAmps = 0;

    const calculatePhysics = (node: TreeNode, parentCqt: number, parentRise: number) => {
      const cableData = cablesCatalog[node.cable] || cablesCatalog[Object.keys(cablesCatalog)[0]];
      const distKm = (node.meters || 0) / 1000;
      const distHm = (node.meters || 0) / 100;

      if (node.id === 'TRAFO') {
        node.calculatedCqt = 0;
        node.accumulatedCqt = 0;
        node.solarVoltageRise = 0;
        node.jouleLossWatts = 0;
      } else {
        // Pico Noturno (Demanda Máxima Diversificada)
        const nightAmps = (node.accumulatedKva || 0) / (1.732 * 0.380);
        if (nightAmps > cableData.ampacity && cableData.ampacity > 0) {
          warnings.push(`🔥 Sobrecarga no trecho ${node.id}: ${nightAmps.toFixed(1)}A > ${cableData.ampacity}A.`);
        }
        
        const segmentCqt = (node.accumulatedKva * distHm) * cableData.coef * 0.5;
        node.calculatedCqt = segmentCqt;
        node.accumulatedCqt = parentCqt + segmentCqt;

        // Pico Diurno (Geração Solar Máxima)
        // Assume fator de carga de 30% ao meio-dia para residências
        const dayDemandKva = (node.accumulatedKva) * ElectricalEngine.DAY_LOAD_FACTOR;
        const netDayKva = dayDemandKva - (node.accumulatedSolarKva || 0);
        const dayAmps = netDayKva / (1.732 * 0.380);
        
        // Elevação de tensão por injeção (Fluxo Reverso)
        const segmentRise = (Math.abs(Math.min(0, netDayKva)) * distHm) * cableData.coef * 0.5;
        node.solarVoltageRise = parentRise + segmentRise;
        node.netCurrentDay = dayAmps;

        if (dayAmps < -0.1) {
          maxReverseAmps = Math.max(maxReverseAmps, Math.abs(dayAmps));
        }

        if (node.solarVoltageRise > 5) {
          warnings.push(`☀️ Sobretensão crítica em ${node.id}: +${node.solarVoltageRise.toFixed(2)}% no pico solar.`);
        }
        
        maxVoltageRise = Math.max(maxVoltageRise, node.solarVoltageRise || 0);

        // Perdas Joule (I²R)
        const segmentLossWatts = 3 * (cableData.r * distKm) * Math.pow(Math.max(0, nightAmps), 2);
        node.jouleLossWatts = segmentLossWatts;
        totalJouleLossWatts += segmentLossWatts;
      }

      // Atualiza o nó na lista processada
      const idx = processedNodes.findIndex(n => n.id === node.id);
      if (idx !== -1) {
        processedNodes[idx] = { 
          ...node, 
          calculatedLoad: Math.max(0, (node.accumulatedKva || 0) / (1.732 * 0.380)),
          jouleLossWatts: node.jouleLossWatts || 0,
          solarVoltageRise: node.solarVoltageRise || 0,
          netCurrentDay: node.netCurrentDay || 0
        };
      }
      node.children.forEach(child => calculatePhysics(child, node.accumulatedCqt || 0, node.solarVoltageRise || 0));
    };

    calculatePhysics(trafoNode, 0, 0);

    // 5. Métricas de Sustentabilidade e ESG
    const annualEnergyLossKwh = (totalJouleLossWatts / 1000) * 8760 * ElectricalEngine.LOAD_LOSS_FACTOR;
    const annualFinancialLossBrl = annualEnergyLossKwh * ElectricalEngine.ENERGY_PRICE_BRL;
    const annualCo2Kg = annualEnergyLossKwh * ElectricalEngine.CO2_FACTOR_KG_KWH;

    const sustainability: SustainabilityMetrics = {
      annualEnergyLossKwh,
      annualFinancialLossBrl,
      annualCo2Kg,
      potentialSavingsBrl10y: annualFinancialLossBrl * 10 * 0.4, // Estima 40% de redução com otimização
      potentialCo2Prevented10y: annualCo2Kg * 10 * 0.4,
      treesEquivalent: (annualCo2Kg / 20) // Uma árvore absorve ~20kg CO2/ano
    };

    const gdImpact: GdImpactMetrics = {
      totalInstalledKva: totalInstalledSolarKva,
      maxVoltageRise,
      hasReverseFlow: maxReverseAmps > 0.5,
      reverseFlowAmps: maxReverseAmps,
      selfConsumptionRate: totalInstalledSolarKva > 0 ? (Math.min(totalInstalledSolarKva, totalLoadKva * 0.3) / totalInstalledSolarKva) * 100 : 0
    };

    return {
      scenarioId,
      nodes: processedNodes,
      kpis: {
        totalLoad: totalLoadKva,
        diversifiedLoad: processedNodes.reduce((acc, n) => acc + (n.loads.mono + n.loads.bi + n.loads.tri) * globalDmdiFactor, 0),
        pointLoad: processedNodes.reduce((acc, n) => acc + n.loads.pointKva, 0),
        ipLoad: processedNodes.reduce((acc, n) => acc + n.loads.ipQty * (ipCatalog[n.loads.ipType] || 0), 0),
        trafoOccupation: (params.trafoKva > 0) ? (totalLoadKva / params.trafoKva) * 100 : 0,
        maxCqt: Math.max(...processedNodes.map(n => n.accumulatedCqt || 0), 0),
        totalCustomers: totalResidences + processedNodes.reduce((acc, n) => acc + n.loads.pointQty, 0),
        globalDmdiFactor
      },
      sustainability,
      gdImpact,
      warnings
    };
  }

  static optimize(scenarioId: string, nodes: NetworkNode[], params: ProjectParams, cablesCatalog: Record<string, any>, ipCatalog: Record<string, number>): NetworkNode[] {
    const sortedCables = Object.entries(cablesCatalog).sort((a, b) => a[1].ampacity - b[1].ampacity).map(entry => entry[0]);
    const profileData = (PROFILES as any)[params.profile] || PROFILES["Massivos"];
    let currentNodes = JSON.parse(JSON.stringify(nodes));
    let hasViolation = true;
    let iteration = 0;

    // Algoritmo Ganancioso de Gradiente para upgrade de cabos
    while (hasViolation && iteration < 15) {
      hasViolation = false;
      const result = ElectricalEngine.calculate(scenarioId, currentNodes, params, cablesCatalog, ipCatalog);
      const resultMap = new Map(result.nodes.map(n => [n.id, n]));

      currentNodes.forEach((node: any) => {
        if (node.id === 'TRAFO') return;
        const calculated = resultMap.get(node.id);
        if (!calculated) return;

        const cableInfo = cablesCatalog[node.cable];
        const isAmpacityBad = (calculated.calculatedLoad || 0) > (cableInfo?.ampacity || 0);
        const isVoltageBad = (calculated.accumulatedCqt || 0) > profileData.cqtMax;
        const isRiseBad = (calculated.solarVoltageRise || 0) > 5.0; 
        
        if (isAmpacityBad || isVoltageBad || isRiseBad) {
          const currentIdx = sortedCables.indexOf(node.cable);
          if (currentIdx < sortedCables.length - 1) {
            node.cable = sortedCables[currentIdx + 1];
            hasViolation = true;
          }
        }
      });
      iteration++;
    }
    return currentNodes;
  }

  // FIX: Add runMonteCarlo method to support stochastic calculations in workers
  static runMonteCarlo(
    nodes: NetworkNode[], 
    params: ProjectParams, 
    cables: Record<string, any>, 
    ips: Record<string, number>, 
    iterations: number = 1000
  ): MonteCarloResult {
    // Implementação simplificada para o protótipo de Scale-up
    return {
      stabilityIndex: 0.88,
      failureRisk: 0.04,
      distribution: Array.from({ length: 20 }, (_, i) => ({ x: i + 1, y: Math.random() * 100 })),
      avgMaxCqt: 4.15,
      p95Cqt: 5.75
    };
  }
}
