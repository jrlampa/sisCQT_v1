
export const DEFAULT_CABLES = {
  "2#16(25)mm² Al": { r: 1.91, x: 0.10, coef: 0.7779, ampacity: 85 },
  "3x35+54.6mm² Al": { r: 0.87, x: 0.09, coef: 0.2416, ampacity: 135 },
  "3x50+54.6mm² Al": { r: 0.64, x: 0.09, coef: 0.1784, ampacity: 165 },
  "3x70+54.6mm² Al": { r: 0.44, x: 0.08, coef: 0.1248, ampacity: 205 },
  "3x95+54.6mm² Al": { r: 0.32, x: 0.08, coef: 0.0891, ampacity: 250 },
  "3x150+70mm² Al": { r: 0.21, x: 0.08, coef: 0.0573, ampacity: 330 },
};

export const IP_TYPES: Record<string, number> = {
  "Sem IP": 0.0,
  "IP 70W": 0.07,
  "IP 100W": 0.10,
  "IP 150W": 0.15,
  "IP 250W": 0.25,
  "IP 400W": 0.40,
};

export const DMDI_TABLES: Record<string, any[]> = {
  "PRODIST": [
    { min: 1, max: 5, A: 1.50, B: 2.50, C: 4.00, D: 6.00 },
    { min: 6, max: 10, A: 1.20, B: 2.00, C: 3.20, D: 5.00 },
    { min: 11, max: 20, A: 1.00, B: 1.60, C: 2.60, D: 4.00 },
    { min: 21, max: 30, A: 0.90, B: 1.40, C: 2.20, D: 3.40 },
    { min: 31, max: 40, A: 0.85, B: 1.30, C: 2.00, D: 3.20 },
    { min: 41, max: 50, A: 0.80, B: 1.20, C: 1.90, D: 3.00 },
    { min: 51, max: 9999, A: 0.70, B: 1.10, C: 1.70, D: 2.80 },
  ],
  "ABNT": [
    { min: 1, max: 10, A: 1.60, B: 2.70, C: 4.50, D: 7.00 },
    { min: 11, max: 20, A: 1.40, B: 2.30, C: 3.80, D: 6.00 },
    { min: 21, max: 30, A: 1.20, B: 2.00, C: 3.30, D: 5.20 },
    { min: 31, max: 50, A: 1.00, B: 1.80, C: 3.00, D: 4.80 },
    { min: 51, max: 9999, A: 0.90, B: 1.50, C: 2.50, D: 4.00 },
  ]
};

export const PROFILES = {
  "Urbano Padrão": { cqtMax: 5.0, loadMax: 100 },
  "Rural": { cqtMax: 10.0, loadMax: 100 },
  "Massivos": { cqtMax: 6.0, loadMax: 120 },
};
