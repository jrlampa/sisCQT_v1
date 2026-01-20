
import { NetworkNode, ProjectParams, EngineResult, MonteCarloResult } from '../types.ts';
import { DMDI_TABLES, PROFILES } from '../constants.ts';

interface TreeNode extends NetworkNode {
  children: TreeNode[];
  accumulatedKva: number; 
}

export class ElectricalEngine {
  
  /**
   * Executa teste unitário para validação do cálculo de CQT.
   * Verifica a consistência da fórmula: CQT = (kVA * hm * Coef) / 2
   */
  static runUnitTestCqt() {
    console.group("🧪 UNIT TEST: CQT CALCULATION (Theseus 3.1)");
    
    const testCables = { "TEST_CABLE": { r: 1.91, x: 0.10, coef: 0.7779, ampacity: 100 } };
    const testIps = { "Sem IP": 0 };
    const testParams: ProjectParams = {
      trafoKva: 75,
      profile: "Massivos",
      classType: "Manual",
      manualClass: "B",
      normativeTable: "PRODIST"
    };

    // Cenário: 1 Ponto com 10kVA a 100m (1.0 hm)
    const testNodes: NetworkNode[] = [
      { id: 'TRAFO', parentId: '', meters: 0, cable: "TEST_CABLE", loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: "Sem IP", ipQty: 0 } },
      { id: 'TEST_P1', parentId: 'TRAFO', meters: 100, cable: "TEST_CABLE", loads: { mono: 0, bi: 0, tri: 0, pointQty: 1, pointKva: 10, ipType: "Sem IP", ipQty: 0 } }
    ];

    const result = this.calculate("test-uid", testNodes, testParams, testCables, testIps);
    const p1 = result.nodes.find(n => n.id === 'TEST_P1');
    
    // Cálculo esperado: (10kVA * 1.0hm * 0.7779 * 0.5) = 3.8895%
    const expected = 3.8895;
    const actual = p1?.accumulatedCqt || 0;
    const diff = Math.abs(actual - expected);

    console.log("Carga: 10kVA | Distância: 100m | Coef: 0.7779");
    console.log(`Calculado: ${actual.toFixed(4)}% | Esperado: ${expected.toFixed(4)}%`);
    
    if (diff < 0.001) {
      console.log("✅ TESTE PASSOU: Cálculo de CQT preciso.");
    } else {
      console.error("❌ TESTE FALHOU: Divergência no cálculo de CQT.");
    }
    
    console.groupEnd();
  }

  static runMonteCarlo(
    nodes: NetworkNode[], 
    params: ProjectParams, 
    cables: any, 
    ips: any,
    iterations: number = 500
  ): MonteCarloResult {
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
          pointKva: n.loads.pointKva * (0.9 + Math.random() * 0.2)
        }
      }));

      const res = this.calculate('sim', simulatedNodes, params, cables, ips);
      const maxCqt = res.kpis.maxCqt;
      results.push(maxCqt);
      if (maxCqt > limit) failureCount++;
    }

    results.sort((a, b) => a - b);
    
    const bins = 20;
    const min = results[0];
    const max = results[results.length - 1];
    const step = (max - min) / bins;
    const distribution = [];
    
    for (let i = 0; i < bins; i++) {
      const start = min + i * step;
      const end = start + step;
      const count = results.filter(v => v >= start && v < end).length;
      distribution.push({ x: Number(start.toFixed(2)), y: count });
    }

    const stabilityIndex = ((iterations - failureCount) / iterations) * 100;

    return {
      stabilityIndex,
      failureRisk: 100 - stabilityIndex,
      distribution,
      avgMaxCqt: results.reduce((a, b) => a + b, 0) / iterations,
      p95Cqt: results[Math.floor(iterations * 0.95)]
    };
  }

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
      nodeMap.set(node.id, { ...node, children: [], accumulatedKva: 0 });
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

    const getNodeKva = (node: NetworkNode): number => {
      const residencesQty = node.loads.mono + node.loads.bi + node.loads.tri;
      const demandKva = residencesQty * globalDmdiFactor;
      const ipKva = (node.loads.ipQty * (ipCatalog[node.loads.ipType] || 0));
      const pointKva = node.loads.pointKva; 
      totalDiversifiedKva += demandKva;
      totalIpKva += ipKva;
      totalPointKva += pointKva;
      return demandKva + ipKva + pointKva;
    };

    const calculateKvaFlow = (node: TreeNode): number => {
      const myOwnKva = getNodeKva(node);
      const childrenKvaSum = node.children.reduce((acc, child) => acc + calculateKvaFlow(child), 0);
      node.accumulatedKva = myOwnKva + childrenKvaSum;
      return node.accumulatedKva;
    };

    if (trafoNode) calculateKvaFlow(trafoNode);

    const calculateVoltageDrop = (node: TreeNode, parentAccumulatedCqt: number) => {
      const cableData = cablesCatalog[node.cable] || { r: 0, x: 0, coef: 0, ampacity: 0 };
      const distHm = node.meters / 100;

      if (node.id === 'TRAFO') {
        node.calculatedCqt = 0;
        node.accumulatedCqt = 0;
      } else {
        const currentAmps = node.accumulatedKva / (1.732 * 0.380);
        if (currentAmps > cableData.ampacity && cableData.ampacity > 0) {
          warnings.push(`🔥 Sobrecarga em ${node.id}: ${currentAmps.toFixed(1)}A > ${cableData.ampacity}A.`);
        }
        const moment = node.accumulatedKva * distHm;
        const segmentCqt = moment * cableData.coef * 0.5;
        node.calculatedCqt = segmentCqt;
        node.accumulatedCqt = parentAccumulatedCqt + segmentCqt;
      }

      const idx = processedNodes.findIndex(n => n.id === node.id);
      if (idx !== -1) {
        const { children, accumulatedKva, ...nodeData } = node;
        const currentAmps = accumulatedKva / (1.732 * 0.380);
        processedNodes[idx] = { ...nodeData, calculatedLoad: currentAmps };
      }
      node.children.forEach(child => calculateVoltageDrop(child, node.accumulatedCqt || 0));
    };

    if (trafoNode) calculateVoltageDrop(trafoNode, 0);

    const totalLoad = totalDiversifiedKva + totalIpKva + totalPointKva;
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
      const result = this.calculate(scenarioId, currentNodes, params, cablesCatalog, ipCatalog);
      const resultMap = new Map(result.nodes.map(n => [n.id, n]));

      const optimizeBranch = (nodeId: string) => {
        const node = currentNodes.find((n: any) => n.id === nodeId);
        if (!node) return;
        const calculated = resultMap.get(nodeId);
        if (calculated && nodeId !== 'TRAFO') {
          const cableInfo = cablesCatalog[node.cable];
          const isAmpacityBad = (calculated.calculatedLoad || 0) > (cableInfo?.ampacity || 0);
          const isVoltageBad = (calculated.accumulatedCqt || 0) > profileData.cqtMax;
          if (isAmpacityBad || isVoltageBad) {
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
}
