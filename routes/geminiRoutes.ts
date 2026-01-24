import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireProForFeature } from '../middlewares/planMiddleware.js';
import { GeminiService } from '../services/geminiService.js';
import { HttpError } from '../utils/httpError.js';

export const geminiRoutes = Router();

geminiRoutes.post('/ask', authMiddleware as any, requireProForFeature('Theseus AI') as any, async (req, res, next) => {
  const { prompt, context } = req.body;
  if (!prompt) {
    return next(new HttpError(400, 'Prompt é obrigatório.'));
  }

  try {
    const result = await GeminiService.askEngineeringQuestion(prompt, context);
    res.json({ result });
  } catch (error: any) {
    return next(new HttpError(500, 'Erro ao consultar a IA.', undefined, error));
  }
});

