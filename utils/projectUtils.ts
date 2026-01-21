
import { Project, Scenario } from '../types';
import { DEFAULT_CABLES, IP_TYPES } from '../constants';

export const generateId = (prefix: string = 'ID') => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export const createTemplateProject = (name: string, sob: string, pe: string, lat: number, lng: number): Project => ({
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
  cables: DEFAULT_CABLES,
  ipTypes: IP_TYPES,
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
        includeGdInQt: false 
      },
      nodes: [
        { 
          id: 'TRAFO', 
          parentId: '', 
          meters: 0, 
          cable: Object.keys(DEFAULT_CABLES)[4], 
          loads: { mono: 2, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 } 
        },
      ]
    }
  ]
});

export const createSampleProject = (): Project => {
  const base = createTemplateProject('Estudo de Caso: Expansão Barra', '2024.EX01', 'BT-BARRA-09', -23.0003, -43.3658);
  base.id = 'PRJ-SAMPLE-001';
  base.scenarios[0].nodes = [
    { id: 'TRAFO', parentId: '', meters: 0, cable: "3x95+54.6mm² Al", loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 } },
    { id: 'P1', parentId: 'TRAFO', meters: 45, cable: "3x70+54.6mm² Al", loads: { mono: 12, bi: 2, tri: 1, pointQty: 0, pointKva: 0, ipType: 'IP 150W', ipQty: 2, solarKva: 0, solarQty: 0 }, lat: -23.0007, lng: -43.3655 },
    { id: 'P2', parentId: 'P1', meters: 35, cable: "3x35+54.6mm² Al", loads: { mono: 5, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'IP 150W', ipQty: 1, solarKva: 18.5, solarQty: 3 }, lat: -23.0010, lng: -43.3652 }
  ];
  return base;
};
