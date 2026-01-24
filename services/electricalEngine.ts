
import type { NetworkNode, ProjectParams, EngineResult, MonteCarloResult } from '../types.js';
import { DMDI_TABLES, PROFILES } from '../constants.js';

/**
 * Interface estendida para processamento interno da árvore de rede.
 */
interface TreeNode extends NetworkNode {
  children: TreeNode[];
  subtreeTotalKva: number;          // Toda carga abaixo do nó (incluindo ele próprio)
  subtreeTotalSolarKva: number;     // Toda carga solar abaixo do nó
  nodeDistributedKva: number;       // Carga DMDI (Residencial) do próprio nó
  nodeConcentratedKva: number;      // Carga Concentrada (IP + Pontuais) do próprio nó
  nodeSolarKva: number;             // Geração Solar do próprio nó
}

export class ElectricalEngine {
  
  private static readonly ENERGY_PRICE_BRL = 0.85;
  private static readonly CO2_FACTOR_KG_KWH = 0.126;
  private static readonly LOAD_LOSS_FACTOR = 0.25;
  private static readonly DAY_LOAD_FACTOR = 0.30; 

  /**
   * Executa o cálculo de fluxo de carga e queda de tensão (CQT).
   * Segue o princípio de não arredondar valores durante o acúmulo para evitar erros de precisão IEEE 754.
   */
  static calculate(
    scenarioId: string, 
    nodes: NetworkNode[], 
    params: ProjectParams, 
    cablesCatalog: Record<string, { r: number, x: number, coef: number, ampacity: number }>, 
    ipCatalog: Record<string, number>
  ): EngineResult {
    const processedNodes: NetworkNode[] = JSON.parse(JSON.stringify(nodes));
    const warnings: string[] = [];
    
    // 1. Construção do Mapeamento de Árvore
    const nodeMap = new Map<string, TreeNode>();
    processedNodes.forEach(node => {
      nodeMap.set(node.id, { 
        ...node, 
        children: [], 
        subtreeTotalKva: 0, 
        subtreeTotalSolarKva: 0,
        nodeDistributedKva: 0,
        nodeConcentratedKva: 0,
        nodeSolarKva: 0
      });
    });

    const trafoNode = nodeMap.get('TRAFO');
    if (!trafoNode) throw new Error("Nó 'TRAFO' não encontrado. Topologia inválida.");

    nodeMap.forEach(node => {
      if (node.id !== 'TRAFO') {
        const parent = nodeMap.get(node.parentId);
        if (parent) parent.children.push(node);
        else warnings.push(`⚠️ Nó órfão detectado: ${node.id} não possui pai válido.`);
      }
    });

    // 2. Determinação do Fator DMDI (Fator de Diversidade)
    const totalResidences = processedNodes.reduce((acc, n) => 
        acc + (n.loads?.mono || 0) + (n.loads?.bi || 0) + (n.loads?.tri || 0), 0);

    let globalDmdiFactor = 0;
    if (totalResidences > 0) {
      const currentTable = DMDI_TABLES[params.normativeTable] || DMDI_TABLES["PRODIST"];
      const row = currentTable.find(r => totalResidences >= r.min && totalResidences <= r.max) 
               || currentTable[currentTable.length - 1];
      globalDmdiFactor = (row[params.manualClass as keyof typeof row] as number) || 0;
    }

    // 3. Fase Bottom-Up: Acumulação de Cargas Reais
    const accumulateLoads = (node: TreeNode, path: Set<string>): { total: number, solar: number } => {
      if (path.has(node.id)) {
        throw new Error(`Cyclic dependency detected in network topology involving node ${node.id}`);
      }
      path.add(node.id);

      // Carga Distribuída: Residencial que se distribui ao longo do vão
      const resQty = (node.loads?.mono || 0) + (node.loads?.bi || 0) + (node.loads?.tri || 0);
      node.nodeDistributedKva = resQty * globalDmdiFactor;
      
      // Carga Concentrada: IP e Pontuais que estão localizadas no final do vão (nó)
      const ipKva = (node.loads?.ipQty || 0) * (ipCatalog[node.loads?.ipType] || 0);
      const pointKva = node.loads?.pointKva || 0;
      node.nodeConcentratedKva = ipKva + pointKva;
      
      // Geração Solar Local
      node.nodeSolarKva = node.loads?.solarKva || 0;

      const childrenTotals = node.children.reduce((acc, child) => {
        const res = accumulateLoads(child, new Set(path)); // Pass a copy of the path
        return { total: acc.total + res.total, solar: acc.solar + res.solar };
      }, { total: 0, solar: 0 });

      // Total acumulado que passa por este nó
      node.subtreeTotalKva = node.nodeDistributedKva + node.nodeConcentratedKva + childrenTotals.total;
      node.subtreeTotalSolarKva = node.nodeSolarKva + childrenTotals.solar;

      return { total: node.subtreeTotalKva, solar: node.subtreeTotalSolarKva };
    };

    accumulateLoads(trafoNode, new Set());

    // 4. Fase Top-Down: Cálculo Físico (Queda de Tensão e Perdas)
    let totalJouleLossWatts = 0;
    let maxVoltageRise = 0;
    let maxReverseAmps = 0;

    const calculatePhysics = (node: TreeNode, parentCqt: number, parentRise: number) => {
      const cableData = cablesCatalog[node.cable] || cablesCatalog[Object.keys(cablesCatalog)[0]];
      const distKm = (node.meters || 0) / 1000;
      const distHm = (node.meters || 0) / 100;

      if (node.id === 'TRAFO') {
        node.accumulatedCqt = 0;
        node.solarVoltageRise = 0;
      } else {
        // --- MÉTODO DOS MOMENTOS (CQT) ---
        // LÓGICA CORRETA:
        // Cargas a Jusante (atravessam o trecho): Fator 1.0
        // Carga Concentrada no Nó (IP/Pontual): Fator 1.0
        // Carga Distribuída do Nó (Residencial): Fator 0.5
        
        const loadToChildren = node.subtreeTotalKva - (node.nodeDistributedKva + node.nodeConcentratedKva);
        
        // Aplicação de GD na QT se habilitado (subtração vetorial simplificada)
        const effectiveDistributed = params.includeGdInQt 
          ? Math.max(0, node.nodeDistributedKva - (node.nodeSolarKva * 0.5))
          : node.nodeDistributedKva;

        const momentKva = (loadToChildren + node.nodeConcentratedKva) + (effectiveDistributed * 0.5);
        const segmentCqt = momentKva * distHm * cableData.coef;
        
        node.accumulatedCqt = parentCqt + segmentCqt;

        // --- CÁLCULO DE RISE (ELEVAÇÃO DE TENSÃO POR GD) ---
        const dayDemandKva = node.subtreeTotalKva * ElectricalEngine.DAY_LOAD_FACTOR;
        const netDayKva = dayDemandKva - node.subtreeTotalSolarKva;
        
        // Rise assume pior caso: fluxo reverso concentrado (Fator 1.0)
        const segmentRise = Math.abs(Math.min(0, netDayKva)) * distHm * cableData.coef;
        node.solarVoltageRise = parentRise + segmentRise;
        node.netCurrentDay = netDayKva / (1.732 * 0.380);

        if (node.netCurrentDay < -0.1) {
           maxReverseAmps = Math.max(maxReverseAmps, Math.abs(node.netCurrentDay));
        }
        maxVoltageRise = Math.max(maxVoltageRise, node.solarVoltageRise);

        // --- PERDAS JOULE ---
        const amps = node.subtreeTotalKva / (1.732 * 0.380);
        const segmentLossWatts = 3 * (cableData.r * distKm) * Math.pow(Math.max(0, amps), 2);
        node.jouleLossWatts = segmentLossWatts;
        totalJouleLossWatts += segmentLossWatts;

        if (amps > cableData.ampacity && cableData.ampacity > 0) {
          warnings.push(`🔥 Sobrecarga em ${node.id}: ${amps}A > ${cableData.ampacity}A`);
        }
      }

      // Sincronização sem arredondamentos intermediários
      const idx = processedNodes.findIndex(n => n.id === node.id);
      if (idx !== -1) {
        processedNodes[idx] = { 
          ...node, 
          calculatedLoad: node.subtreeTotalKva / (1.732 * 0.380),
          accumulatedCqt: node.accumulatedCqt,
          solarVoltageRise: node.solarVoltageRise,
          jouleLossWatts: node.jouleLossWatts,
          netCurrentDay: node.netCurrentDay
        };
      }

      node.children.forEach(child => calculatePhysics(child, node.accumulatedCqt || 0, node.solarVoltageRise || 0));
    };

    calculatePhysics(trafoNode, 0, 0);

    // 5. Métricas de Sustentabilidade
    const energyPriceBrlKwh =
      typeof (params as any)?.energyPriceBrlKwh === 'number' && Number.isFinite((params as any).energyPriceBrlKwh) && (params as any).energyPriceBrlKwh > 0
        ? Number((params as any).energyPriceBrlKwh)
        : ElectricalEngine.ENERGY_PRICE_BRL;
    const annualEnergyLossKwh = (totalJouleLossWatts / 1000) * 8760 * ElectricalEngine.LOAD_LOSS_FACTOR;
    const annualFinancialLossBrl = annualEnergyLossKwh * energyPriceBrlKwh;
    const annualCo2Kg = annualEnergyLossKwh * ElectricalEngine.CO2_FACTOR_KG_KWH;

    return {
      scenarioId,
      nodes: processedNodes,
      kpis: {
        totalLoad: trafoNode.subtreeTotalKva,
        diversifiedLoad: processedNodes.reduce((acc, n) => acc + (n.loads.mono + n.loads.bi + n.loads.tri) * globalDmdiFactor, 0),
        pointLoad: processedNodes.reduce((acc, n) => acc + n.loads.pointKva, 0),
        ipLoad: processedNodes.reduce((acc, n) => acc + n.loads.ipQty * (ipCatalog[n.loads.ipType] || 0), 0),
        trafoOccupation: (params.trafoKva > 0) ? (trafoNode.subtreeTotalKva / params.trafoKva) * 100 : 0,
        maxCqt: Math.max(...processedNodes.map(n => n.accumulatedCqt || 0), 0),
        totalCustomers: processedNodes.reduce((acc, n) => acc + (n.loads.mono + n.loads.bi + n.loads.tri + n.loads.pointQty), 0),
        globalDmdiFactor
      },
      sustainability: {
        annualEnergyLossKwh,
        annualFinancialLossBrl,
        annualCo2Kg,
        potentialSavingsBrl10y: annualFinancialLossBrl * 10 * 0.4,
        potentialCo2Prevented10y: annualCo2Kg * 10 * 0.4,
        treesEquivalent: annualCo2Kg / 20
      },
      gdImpact: {
        totalInstalledKva: trafoNode.subtreeTotalSolarKva,
        maxVoltageRise,
        hasReverseFlow: maxReverseAmps > 0.5,
        reverseFlowAmps: maxReverseAmps,
        selfConsumptionRate: trafoNode.subtreeTotalSolarKva > 0 ? 30 : 0
      },
      warnings
    };
  }

  static optimize(scenarioId: string, nodes: NetworkNode[], params: ProjectParams, cablesCatalog: Record<string, any>, ipCatalog: Record<string, number>): NetworkNode[] {
    const sortedCables = Object.entries(cablesCatalog).sort((a, b) => a[1].ampacity - b[1].ampacity).map(entry => entry[0]);
    const profileData = (PROFILES as any)[params.profile] || PROFILES["Massivos"];
    let currentNodes = JSON.parse(JSON.stringify(nodes));
    let hasViolation = true;
    let iteration = 0;

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

  private static seedFromAny(seed: unknown): number {
    if (typeof seed === 'number' && Number.isFinite(seed)) return seed | 0;
    if (typeof seed === 'string') {
      // hash simples determinístico (FNV-1a 32-bit)
      let h = 2166136261;
      for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h | 0;
    }
    // default: seed baseada no tempo (não determinístico)
    return (Date.now() ^ Math.floor(Math.random() * 1e9)) | 0;
  }

  private static mulberry32(seed: number) {
    let t = seed | 0;
    return () => {
      t += 0x6D2B79F5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  private static clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  private static quantile(sorted: number[], q: number): number {
    if (sorted.length === 0) return 0;
    const qq = ElectricalEngine.clamp(q, 0, 1);
    const idx = (sorted.length - 1) * qq;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    const t = idx - lo;
    return sorted[lo] * (1 - t) + sorted[hi] * t;
  }

  private static perturbLoad(rng: () => number, base: number, pct: number): number {
    // Variação uniforme em ±pct
    const factor = 1 + (rng() * 2 - 1) * pct;
    return Math.max(0, base * factor);
  }

  /**
   * Monte Carlo (real) para avaliar risco de violação sob incertezas de carga/GD.
   * - Determinístico se `seed` for fornecido.\n   * - Por padrão usa histograma (20 bins) do `maxCqt`.\n   */
  static runMonteCarlo(
    nodes: NetworkNode[],
    params: ProjectParams,
    cables: Record<string, any>,
    ips: Record<string, number>,
    iterations: number = 1000,
    seed?: unknown
  ): MonteCarloResult {
    const safeIterations = Math.max(10, Math.min(20000, Math.floor(iterations || 1000)));
    const rng = ElectricalEngine.mulberry32(ElectricalEngine.seedFromAny(seed));
    const profileData = (PROFILES as any)[params.profile] || PROFILES['Massivos'];
    const cqtLimit = typeof profileData?.cqtMax === 'number' ? profileData.cqtMax : 6.0;

    const maxCqts: number[] = [];
    let failures = 0;

    for (let i = 0; i < safeIterations; i++) {
      // clona e perturba cargas
      const perturbedNodes: NetworkNode[] = nodes.map((n) => {
        const loads = n.loads || ({} as any);
        const mono = Math.round(ElectricalEngine.perturbLoad(rng, Number(loads.mono || 0), 0.15));
        const bi = Math.round(ElectricalEngine.perturbLoad(rng, Number(loads.bi || 0), 0.15));
        const tri = Math.round(ElectricalEngine.perturbLoad(rng, Number(loads.tri || 0), 0.15));
        const ipQty = Math.round(ElectricalEngine.perturbLoad(rng, Number(loads.ipQty || 0), 0.20));
        const pointQty = Math.round(ElectricalEngine.perturbLoad(rng, Number(loads.pointQty || 0), 0.20));
        const pointKva = ElectricalEngine.perturbLoad(rng, Number(loads.pointKva || 0), 0.25);
        const solarQty = Math.round(ElectricalEngine.perturbLoad(rng, Number(loads.solarQty || 0), 0.30));
        const solarKva = ElectricalEngine.perturbLoad(rng, Number(loads.solarKva || 0), 0.30);

        return {
          ...n,
          loads: {
            ...loads,
            mono,
            bi,
            tri,
            ipQty,
            pointQty,
            pointKva,
            solarQty,
            solarKva,
          },
        } as NetworkNode;
      });

      const result = ElectricalEngine.calculate('MC', perturbedNodes, params, cables, ips);
      const maxCqt = Math.max(...result.nodes.map((n) => n.accumulatedCqt || 0), 0);
      maxCqts.push(maxCqt);

      // Critérios de falha: CQT acima do limite, sobrecarga de cabo, ou elevação de tensão acima de 5%.
      const hasCqtFail = maxCqt > cqtLimit;
      const hasOverload = result.nodes.some((n) => {
        if (n.id === 'TRAFO') return false;
        const amp = cables?.[n.cable]?.ampacity;
        if (typeof amp !== 'number' || amp <= 0) return false;
        return (n.calculatedLoad || 0) > amp;
      });
      const hasRiseFail = (result.gdImpact?.maxVoltageRise || 0) > 5.0;

      if (hasCqtFail || hasOverload || hasRiseFail) failures += 1;
    }

    const sorted = [...maxCqts].sort((a, b) => a - b);
    const avgMaxCqt = maxCqts.reduce((a, b) => a + b, 0) / maxCqts.length;
    const p95Cqt = ElectricalEngine.quantile(sorted, 0.95);
    const failureRisk = failures / maxCqts.length;

    // Histograma de 20 bins (x = limite superior do bin, y = contagem)
    const bins = 20;
    const min = sorted[0] ?? 0;
    const max = sorted[sorted.length - 1] ?? 0;
    const span = Math.max(1e-6, max - min);
    const counts = Array.from({ length: bins }, () => 0);

    for (const v of sorted) {
      const idx = Math.min(bins - 1, Math.floor(((v - min) / span) * bins));
      counts[idx] += 1;
    }

    const distribution = counts.map((y, i) => {
      const x = min + ((i + 1) / bins) * span;
      return { x: Number(x.toFixed(2)), y };
    });

    // Índice de estabilidade: 1 - risco, penalizando p95 acima do limite.
    const p95Penalty = Math.max(0, (p95Cqt - cqtLimit) / Math.max(1e-6, cqtLimit));
    const stabilityIndex = ElectricalEngine.clamp(1 - failureRisk - p95Penalty * 0.5, 0, 1);

    return {
      stabilityIndex,
      failureRisk,
      distribution,
      avgMaxCqt: Number(avgMaxCqt.toFixed(2)),
      p95Cqt: Number(p95Cqt.toFixed(2)),
    };
  }
}
