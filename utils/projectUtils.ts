
import { Project, Scenario } from '../types';

export const generateId = (prefix: string = 'ID') => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

function pickKey<T extends Record<string, any>>(obj: T, preferred: (keyof T | string)[], fallbackIndex: number = 0): string {
  const keys = Object.keys(obj || {});
  for (const p of preferred) {
    if (typeof p === 'string' && (obj as any)?.[p] !== undefined) return p;
  }
  return keys[fallbackIndex] || keys[0] || '';
}

export const createTemplateProject = (
  name: string,
  sob: string,
  pe: string,
  lat: number,
  lng: number,
  defaults: { cables: Project['cables']; ipTypes: Project['ipTypes']; energyPriceBrlKwh?: number }
): Project => {
  const cables = defaults?.cables || {};
  const ipTypes = defaults?.ipTypes || {};
  const defaultCable = Object.keys(cables)[4] || Object.keys(cables)[0] || "3x95+54.6mm² Al";

  return ({
  id: generateId('PRJ'),
  name: name || 'Novo Projeto BT',
  metadata: { 
    sob, 
    electricPoint: pe, 
    lat, 
    lng, 
    client: '', 
    address: '', 
    district: '', 
    city: 'Rio de Janeiro' 
  },
  activeScenarioId: 'SCN-1',
  updatedAt: new Date().toISOString(),
  cables,
  ipTypes,
  reportConfig: {
    showJustification: true, 
    showKpis: true, 
    showTopology: true,
    showMaterials: true, 
    showSignatures: true, 
    showUnifilar: true,
    showComparison: false // Inicia desabilitado por padrão
  },
  scenarios: [
    {
      id: 'SCN-1',
      name: 'ATUAL',
      updatedAt: new Date().toISOString(),
      params: { 
        trafoKva: 75, 
        profile: 'Massivos', 
        classType: 'Automatic', 
        manualClass: 'B', 
        normativeTable: 'PRODIST', 
        includeGdInQt: false,
        energyPriceBrlKwh: defaults?.energyPriceBrlKwh
      },
      nodes: [
        { 
          id: 'TRAFO', 
          parentId: '', 
          meters: 0, 
          cable: defaultCable, 
          loads: { mono: 2, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 } 
        },
      ]
    }
  ]
});
};

export const createSampleProject = (defaults: { cables: Project['cables']; ipTypes: Project['ipTypes']; energyPriceBrlKwh?: number }): Project => {
  const base = createTemplateProject('Estudo de Caso: Expansão Barra', '2024.EX01', 'BT-BARRA-09', -23.0003, -43.3658, defaults);
  base.id = 'PRJ-SAMPLE-001';
  base.scenarios[0].nodes = [
    { id: 'TRAFO', parentId: '', meters: 0, cable: "3x95+54.6mm² Al", loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 } },
    { id: 'P1', parentId: 'TRAFO', meters: 45, cable: "3x70+54.6mm² Al", loads: { mono: 12, bi: 2, tri: 1, pointQty: 0, pointKva: 0, ipType: 'IP 150W', ipQty: 2, solarKva: 0, solarQty: 0 }, lat: -23.0007, lng: -43.3655 },
    { id: 'P2', parentId: 'P1', meters: 35, cable: "3x35+54.6mm² Al", loads: { mono: 5, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'IP 150W', ipQty: 1, solarKva: 18.5, solarQty: 3 }, lat: -23.0010, lng: -43.3652 }
  ];
  return base;
};

/**
 * Projeto modelo “WELCOME” para novos usuários: exercita Editor, Comparativos, GD Solar, IP, cargas pontuais,
 * e fornece cenários (ATUAL vs OTIMIZADO) prontos para comparar.
 */
export const createWelcomeProject = (defaults: { cables: Project['cables']; ipTypes: Project['ipTypes']; energyPriceBrlKwh?: number }): Project => {
  const cables = defaults?.cables || {};
  const ipTypes = defaults?.ipTypes || {};

  const cableA = pickKey(cables as any, ['3x35', '3x50', '3x70', '3x95'], 0) || '3x95+54.6mm² Al';
  const cableB = pickKey(cables as any, ['3x70', '3x95', '3x120', '3x150'], 1) || cableA;
  const ipKey = pickKey(ipTypes as any, ['LED', 'IP', 'Sem IP'], 0) || 'Sem IP';

  const now = new Date().toISOString();
  const id = generateId('PRJ');

  const scenarioAtual: Scenario = {
    id: 'SCN-1',
    name: 'ATUAL (WELCOME)',
    updatedAt: now,
    params: {
      trafoKva: 150,
      profile: 'Massivos',
      classType: 'Automatic',
      manualClass: 'B',
      normativeTable: 'PRODIST',
      includeGdInQt: false,
      energyPriceBrlKwh: defaults?.energyPriceBrlKwh,
    },
    nodes: [
      { id: 'TRAFO', parentId: '', meters: 0, cable: cableB, loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 }, lat: -22.9068, lng: -43.1729 },
      { id: 'P-1', parentId: 'TRAFO', meters: 45, cable: cableA, loads: { mono: 12, bi: 2, tri: 1, pointQty: 1, pointKva: 25, ipType: ipKey, ipQty: 2, solarKva: 0, solarQty: 0 }, lat: -22.9071, lng: -43.1726 },
      { id: 'P-2', parentId: 'P-1', meters: 35, cable: cableA, loads: { mono: 6, bi: 0, tri: 1, pointQty: 2, pointKva: 15, ipType: ipKey, ipQty: 1, solarKva: 18, solarQty: 3 }, lat: -22.9075, lng: -43.1722 },
      { id: 'P-3', parentId: 'P-2', meters: 30, cable: cableA, loads: { mono: 3, bi: 1, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 8, solarQty: 1 }, lat: -22.9078, lng: -43.1718 },
    ],
  };

  const scenarioOtimizado: Scenario = {
    id: 'SCN-2',
    name: 'OTIMIZADO (WELCOME)',
    updatedAt: now,
    params: {
      ...scenarioAtual.params,
      includeGdInQt: true,
    },
    nodes: scenarioAtual.nodes.map((n) => ({
      ...n,
      // “otimização” demonstrativa: cabos maiores nos trechos e pequena redução de vão.
      meters: n.id === 'TRAFO' ? 0 : Math.max(10, (n.meters || 0) - 5),
      cable: n.id === 'TRAFO' ? cableB : cableB,
    })),
  };

  return {
    id,
    name: 'Projeto Modelo (WELCOME)',
    metadata: {
      sob: 'WELCOME.0001',
      electricPoint: 'BT-RJ-WELCOME',
      lat: -22.9068,
      lng: -43.1729,
      client: 'IM3 Brasil',
      address: 'Avenida Atlântica, 1000',
      district: 'Copacabana',
      city: 'Rio de Janeiro',
    },
    activeScenarioId: scenarioAtual.id,
    updatedAt: now,
    cables,
    ipTypes,
    reportConfig: {
      showJustification: true,
      showKpis: true,
      showTopology: true,
      showMaterials: true,
      showSignatures: true,
      showUnifilar: true,
      showComparison: true,
    },
    scenarios: [scenarioAtual, scenarioOtimizado],
  };
};
