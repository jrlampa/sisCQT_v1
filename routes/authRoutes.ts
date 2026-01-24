import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';

export const authRoutes = Router();

authRoutes.post('/sync', authMiddleware as any, (req, res) => {
  res.json({ user: req.user });
});

authRoutes.get('/me', authMiddleware as any, (req, res) => {
  res.json(req.user);
});

