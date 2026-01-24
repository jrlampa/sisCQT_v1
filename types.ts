
export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'Free' | 'Pro' | 'Enterprise';
  authProvider?: 'ENTRA' | 'GOOGLE';
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
  solarKva: number; // Capacidade Solar instalada em kVA
  solarQty: number; // Quantidade de clientes com GD no ponto
}

export interface UtmCoords {
  x: number;
  y: number;
  zone: string;
}

export interface NetworkNode {
  id: string;
  parentId: string;
  meters: number;
  cable: string;
  loads: LoadData;
  lat?: number;
  lng?: number;
  utm?: UtmCoords;
  calculatedCqt?: number;
  accumulatedCqt?: number;
  calculatedLoad?: number;
  jouleLossWatts?: number;
  // Métricas de GD
  solarVoltageRise?: number; // Elevação de tensão em % (fluxo reverso)
  netCurrentDay?: number;    // Corrente líquida ao meio-dia
}

export interface SustainabilityMetrics {
  annualEnergyLossKwh: number;
  annualFinancialLossBrl: number;
  annualCo2Kg: number;
  potentialSavingsBrl10y: number;
  potentialCo2Prevented10y: number;
  treesEquivalent: number;
}

export interface GdImpactMetrics {
  totalInstalledKva: number;
  maxVoltageRise: number;
  hasReverseFlow: boolean;
  reverseFlowAmps: number;
  selfConsumptionRate: number;
}

export interface MonteCarloResult {
  stabilityIndex: number; 
  failureRisk: number;    
  distribution: { x: number, y: number }[]; 
  avgMaxCqt: number;
  p95Cqt: number; 
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
  showComparison: boolean; // Novo campo
}

export interface ProjectParams {
  trafoKva: number;
  profile: string;
  classType: 'Automatic' | 'Manual';
  manualClass: 'A' | 'B' | 'C' | 'D';
  normativeTable: string;
  includeGdInQt?: boolean; // Se true, subtrai GD da carga no pico de CQT
  // Sustentabilidade: custo de energia para monetizar perdas (R$/kWh).
  // Se omitido, o motor usa o default do backend.
  energyPriceBrlKwh?: number;
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
  sustainability: SustainabilityMetrics;
  gdImpact: GdImpactMetrics;
  warnings: string[];
  stochastic?: MonteCarloResult;
}
