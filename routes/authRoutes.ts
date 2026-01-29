import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { issueLocalSessionToken } from '../utils/tokenUtils.js';

export const authRoutes = Router();

authRoutes.post('/sync', authMiddleware as any, async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Usuário não autenticado.' });

    const localToken = await issueLocalSessionToken(user);
    res.json({ user, localToken });
  } catch (err) {
    next(err);
  }
});

authRoutes.get('/me', authMiddleware as any, (req, res) => {
  res.json(req.user);
});

