import { Router } from 'express';
import { DEFAULT_CABLES, IP_TYPES, DMDI_TABLES, PROFILES } from '../constants.js';

export const constantsRoutes = Router();

// Público por design: constantes não são sensíveis e precisam estar disponíveis
// para o frontend carregar no boot sem depender de autenticação.
constantsRoutes.get('/', (_req, res) => {
  res.json({
    cables: DEFAULT_CABLES,
    ipTypes: IP_TYPES,
    dmdiTables: DMDI_TABLES,
    profiles: PROFILES,
  });
});

