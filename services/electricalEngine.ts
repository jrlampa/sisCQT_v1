
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
    const processedNodes: NetworkNode[] = JSON.parse(JSON.stringify(nodes));
    const warnings: string[] = [];
    
    const nodeMap = new Map<string, TreeNode>();
    processedNodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [], accumulatedKva: 0, accumulatedSolarKva: 0 });
    });

    const trafoNode = nodeMap.get('TRAFO');
    nodeMap.forEach(node => {
      if (node.id !== 'TRAFO') {
        const parent = nodeMap.get(node.parentId);
        if (parent) parent.children.push(node);
      }
    });

    const totalResidences = processedNodes.reduce((acc, n) => acc + n.loads.mono + n.loads.bi + n.loads.tri, 0);

    let globalDmdiFactor = 0;
    if (totalResidences > 0) {
      const currentTable = DMDI_TABLES[params.normativeTable] || DMDI_TABLES["PRODIST"];
      const row = currentTable.find(r => totalResidences >= r.min && totalResidences <= r.max) || currentTable[currentTable.length - 1];
      globalDmdiFactor = row[params.manualClass as keyof typeof row] as number;
    }

    let totalDiversifiedKva = 0;
    let totalPointKva = 0;
    let totalIpKva = 0;
    let totalJouleLossWatts = 0;
    let totalInstalledKva = 0;

    const getNodeLoadInfo = (node: NetworkNode) => {
      const residencesQty = node.loads.mono + node.loads.bi + node.loads.tri;
      const demandKva = residencesQty * globalDmdiFactor;
      const ipKva = (node.loads.ipQty * (ipCatalog[node.loads.ipType] || 0));
      const pointKva = node.loads.pointKva; 
      const solarKva = node.loads.solarKva || 0;
      
      totalDiversifiedKva += demandKva;
      totalIpKva += ipKva;
      totalPointKva += pointKva;
      totalInstalledKva += solarKva;

      const qtLoadKva = params.includeGdInQt ? (demandKva + ipKva + pointKva - (solarKva * 0.5)) : (demandKva + ipKva + pointKva);

      return { kva: qtLoadKva, solar: solarKva, rawKva: demandKva + ipKva + pointKva };
    };

    const calculateKvaFlow = (node: TreeNode): { kva: number, solar: number, rawKva: number } => {
      const myInfo = getNodeLoadInfo(node);
      const childrenFlow = node.children.reduce((acc, child) => {
        const res = calculateKvaFlow(child);
        return { kva: acc.kva + res.kva, solar: acc.solar + res.solar, rawKva: acc.rawKva + res.rawKva };
      }, { kva: 0, solar: 0, rawKva: 0 });
      
      node.accumulatedKva = myInfo.kva + childrenFlow.kva;
      node.accumulatedSolarKva = myInfo.solar + childrenFlow.solar;
      return { kva: node.accumulatedKva, solar: node.accumulatedSolarKva, rawKva: myInfo.rawKva + childrenFlow.rawKva };
    };

    if (trafoNode) calculateKvaFlow(trafoNode);

    let maxVoltageRise = 0;
    let hasReverseFlow = false;
    let maxReverseAmps = 0;

    const calculatePhysics = (node: TreeNode, parentAccumulatedCqt: number, parentVoltageRise: number) => {
      const cableData = cablesCatalog[node.cable] || { r: 0, x: 0, coef: 0, ampacity: 0 };
      const distKm = node.meters / 1000;

      if (node.id === 'TRAFO') {
        node.calculatedCqt = 0;
        node.accumulatedCqt = 0;
        node.jouleLossWatts = 0;
        node.solarVoltageRise = 0;
      } else {
        const nightAmps = node.accumulatedKva / (1.732 * 0.380);
        if (nightAmps > cableData.ampacity && cableData.ampacity > 0) {
          warnings.push(`🔥 Sobrecarga em ${node.id}: ${nightAmps.toFixed(1)}A > ${cableData.ampacity}A.`);
        }
        
        const distHm = node.meters / 100;
        const segmentCqt = (node.accumulatedKva * distHm) * cableData.coef * 0.5;
        node.calculatedCqt = segmentCqt;
        node.accumulatedCqt = parentAccumulatedCqt + segmentCqt;

        const dayDemandKva = (node.accumulatedKva - (totalIpKva / processedNodes.length)) * ElectricalEngine.DAY_LOAD_FACTOR;
        const netDayKva = dayDemandKva - node.accumulatedSolarKva;
        const dayAmps = netDayKva / (1.732 * 0.380);
        
        const segmentRise = (Math.abs(Math.min(0, netDayKva)) * distHm) * cableData.coef * 0.5;
        node.solarVoltageRise = parentVoltageRise + segmentRise;
        node.netCurrentDay = dayAmps;

        if (dayAmps < 0) {
          hasReverseFlow = true;
          maxReverseAmps = Math.max(maxReverseAmps, Math.abs(dayAmps));
          
          if (!warnings.some(w => w.includes("INVERSÃO DE FLUXO"))) {
             warnings.push(`🔄 INVERSÃO DE FLUXO DETECTADA: O ponto ${node.id} apresenta injeção líquida de potência.`);
          }
        }

        if (node.solarVoltageRise > 5) {
          warnings.push(`☀️ Risco de Sobretensão Crítica em ${node.id}: +${node.solarVoltageRise.toFixed(2)}% (Pico Solar).`);
        }
        
        maxVoltageRise = Math.max(maxVoltageRise, node.solarVoltageRise);

        const segmentLossWatts = 3 * (cableData.r * distKm) * Math.pow(nightAmps, 2);
        node.jouleLossWatts = segmentLossWatts;
        totalJouleLossWatts += segmentLossWatts;
      }

      const idx = processedNodes.findIndex(n => n.id === node.id);
      if (idx !== -1) {
        processedNodes[idx] = { 
          ...node, 
          calculatedLoad: node.accumulatedKva / (1.732 * 0.380),
          jouleLossWatts: node.jouleLossWatts,
          solarVoltageRise: node.solarVoltageRise,
          netCurrentDay: node.netCurrentDay
        };
      }
      node.children.forEach(child => calculatePhysics(child, node.accumulatedCqt || 0, node.solarVoltageRise || 0));
    };

    if (trafoNode) calculatePhysics(trafoNode, 0, 0);

    const totalLoad = totalDiversifiedKva + totalIpKva + totalPointKva;

    const annualEnergyLossKwh = (totalJouleLossWatts / 1000) * 8760 * ElectricalEngine.LOAD_LOSS_FACTOR;
    const annualFinancialLossBrl = annualEnergyLossKwh * ElectricalEngine.ENERGY_PRICE_BRL;
    const annualCo2Kg = annualEnergyLossKwh * ElectricalEngine.CO2_FACTOR_KG_KWH;

    const sustainability: SustainabilityMetrics = {
      annualEnergyLossKwh,
      annualFinancialLossBrl,
      annualCo2Kg,
      potentialSavingsBrl10y: annualFinancialLossBrl * 10 * 0.35,
      potentialCo2Prevented10y: annualCo2Kg * 10 * 0.35,
      treesEquivalent: (annualCo2Kg / 20)
    };

    const gdImpact: GdImpactMetrics = {
      totalInstalledKva,
      maxVoltageRise,
      hasReverseFlow,
      reverseFlowAmps: maxReverseAmps,
      selfConsumptionRate: totalInstalledKva > 0 ? (Math.min(totalInstalledKva, totalLoad * 0.4) / totalInstalledKva) * 100 : 0
    };

    return {
      scenarioId,
      nodes: processedNodes,
      kpis: {
        totalLoad,
        diversifiedLoad: totalDiversifiedKva,
        pointLoad: totalPointKva,
        ipLoad: totalIpKva,
        trafoOccupation: params.trafoKva > 0 ? (totalLoad / params.trafoKva) * 100 : 0,
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

    while (hasViolation && iteration < 10) {
      hasViolation = false;
      const result = ElectricalEngine.calculate(scenarioId, currentNodes, params, cablesCatalog, ipCatalog);
      const resultMap = new Map(result.nodes.map(n => [n.id, n]));

      const optimizeBranch = (nodeId: string) => {
        const node = currentNodes.find((n: any) => n.id === nodeId);
        if (!node) return;
        const calculated = resultMap.get(nodeId);
        if (calculated && nodeId !== 'TRAFO') {
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
        }
        currentNodes.filter((n: any) => n.parentId === nodeId).forEach((child: any) => optimizeBranch(child.id));
      };
      optimizeBranch('TRAFO');
      iteration++;
    }
    return currentNodes;
  }

  static runMonteCarlo(nodes: NetworkNode[], params: ProjectParams, cables: any, ips: any, iterations: number = 500): MonteCarloResult {
    const results: number[] = [];
    let failureCount = 0;
    const profileData = (PROFILES as any)[params.profile] || PROFILES["Massivos"];
    const limit = profileData.cqtMax;

    for (let i = 0; i < iterations; i++) {
      const simulatedNodes = nodes.map(n => ({
        ...n,
        loads: {
          ...n.loads,
          mono: Math.round(n.loads.mono * (0.85 + Math.random() * 0.3)),
          bi: Math.round(n.loads.bi * (0.85 + Math.random() * 0.3)),
          tri: Math.round(n.loads.tri * (0.85 + Math.random() * 0.3)),
          pointKva: n.loads.pointKva * (0.9 + Math.random() * 0.2),
          solarKva: (n.loads.solarKva || 0) * (0.95 + Math.random() * 0.1)
        }
      }));

      const res = ElectricalEngine.calculate('sim', simulatedNodes, params, cables, ips);
      const maxCqt = res.kpis.maxCqt;
      results.push(maxCqt);
      if (maxCqt > limit) failureCount++;
    }

    results.sort((a, b) => a - b);
    const bins = 20;
    const min = results[0] || 0;
    const max = results[results.length - 1] || 1;
    const step = (max - min) / bins;
    const distribution = [];
    for (let i = 0; i < bins; i++) {
      const start = min + i * step;
      const count = results.filter(v => v >= start && v < start + step).length;
      distribution.push({ x: Number(start.toFixed(2)), y: count });
    }

    const stabilityIndex = ((iterations - failureCount) / iterations) * 100;

    return {
      stabilityIndex,
      failureRisk: 100 - stabilityIndex,
      distribution,
      avgMaxCqt: results.reduce((a, b) => a + b, 0) / iterations,
      p95Cqt: results[Math.floor(iterations * 0.95)] || 0
    };
  }

  static runUnitTestCqt() {}
}
