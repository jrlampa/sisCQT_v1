import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { gisController } from '../controllers/gisController.js';
import { CreateGisNodeSchema } from '../schemas/gisSchemas.js';

export const gisRoutes = Router();

gisRoutes.get('/nodes', authMiddleware as any, gisController.getNodes);
gisRoutes.post('/nodes', authMiddleware as any, validate(CreateGisNodeSchema) as any, gisController.createNode);

