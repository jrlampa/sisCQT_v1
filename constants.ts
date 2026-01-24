// todo tranformar em database externa // 

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
    { min: 1, max: 5, A: 1.0, B: 1.6, C: 2.6, D: 4.0 },
    { min: 6, max: 10, A: 0.9, B: 1.4, C: 2.2, D: 3.4 },
    { min: 11, max: 15, A: 0.8, B: 1.2, C: 1.9, D: 3.0 },
    { min: 16, max: 20, A: 0.7, B: 1.1, C: 1.7, D: 2.6 },
    { min: 21, max: 25, A: 0.6, B: 0.9, C: 1.5, D: 2.3 },
    { min: 26, max: 30, A: 0.5, B: 0.9, C: 1.4, D: 2.1 },
    { min: 31, max: 40, A: 0.5, B: 0.8, C: 1.3, D: 2.0 },
    { min: 41, max: 9999, A: 0.5, B: 0.8, C: 1.3, D: 2.0 },
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
