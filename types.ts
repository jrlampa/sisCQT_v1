
export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'Free' | 'Pro' | 'Enterprise';
  role?: 'user' | 'admin';
  avatar?: string;
}

export interface LoadData {
  mono: number;
  bi: number;
  tri: number;
  pointQty: number; 
  pointKva: number;
  ipType: string;
  ipQty: number;
}

export interface NetworkNode {
  id: string;
  parentId: string;
  meters: number;
  cable: string;
  loads: LoadData;
  calculatedCqt?: number;
  accumulatedCqt?: number;
  calculatedLoad?: number;
}

export interface MonteCarloResult {
  stabilityIndex: number; // 0 a 100
  failureRisk: number;    // 0 a 100
  distribution: { x: number, y: number }[]; // Dados para o gráfico de densidade
  avgMaxCqt: number;
  p95Cqt: number; // Percentil 95 (pior caso provável)
}

export interface ProjectMetadata {
  sob: string;
  electricPoint: string;
  lat: number;
  lng: number;
  client?: string;
  address?: string;
  district?: string;
  city?: string;
}

export interface ReportConfig {
  showJustification: boolean;
  showKpis: boolean;
  showTopology: boolean;
  showMaterials: boolean;
  showSignatures: boolean;
  showUnifilar: boolean;
}

export interface ProjectParams {
  trafoKva: number;
  profile: string;
  classType: 'Automatic' | 'Manual';
  manualClass: 'A' | 'B' | 'C' | 'D';
  normativeTable: string;
}

export interface Scenario {
  id: string;
  name: string;
  nodes: NetworkNode[];
  params: ProjectParams;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  metadata: ProjectMetadata;
  scenarios: Scenario[];
  activeScenarioId: string;
  updatedAt: string;
  cables: Record<string, { r: number, x: number, coef: number, ampacity: number }>;
  ipTypes: Record<string, number>;
  reportConfig: ReportConfig;
}

export interface EngineResult {
  scenarioId: string;
  nodes: NetworkNode[];
  kpis: {
    totalLoad: number;
    diversifiedLoad: number;
    pointLoad: number;
    ipLoad: number;
    trafoOccupation: number;
    maxCqt: number;
    totalCustomers: number;
    globalDmdiFactor: number;
  };
  warnings: string[];
  stochastic?: MonteCarloResult;
}
