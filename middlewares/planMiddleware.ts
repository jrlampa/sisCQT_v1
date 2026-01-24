import type { RequestHandler } from 'express';
import { prisma } from '../utils/db.js';
import { HttpError } from '../utils/httpError.js';

function isIm3(email: string): boolean {
  return email.toLowerCase().endsWith('@im3brasil.com.br');
}

/**
 * Regras mínimas de plano:
 * - ENTRA (IM3): irrestrito
 * - GOOGLE: Free vs Pro
 */
export function requireProForFeature(featureName: string): RequestHandler {
  return async (req, _res, next) => {
    const user = req.user;
    if (!user) return next(new HttpError(401, 'Token não fornecido'));
    if (isIm3(user.email) || user.plan === 'Enterprise') return next();
    if (user.plan === 'Pro') return next();
    return next(new HttpError(402, `Recurso "${featureName}" disponível apenas no plano Pro.`));
  };
}

export function enforceFreeProjectLimit(maxProjects: number): RequestHandler {
  return async (req, _res, next) => {
    const user = req.user;
    if (!user) return next(new HttpError(401, 'Token não fornecido'));
    if (isIm3(user.email) || user.plan === 'Enterprise' || user.plan === 'Pro') return next();

    // Apenas Free: limita número de projetos
    const count = await prisma.project.count({ where: { userId: user.id } });
    if (count >= maxProjects) {
      return next(new HttpError(402, `Limite do plano Free atingido (${maxProjects} projetos). Assine o Pro para continuar.`));
    }
    return next();
  };
}

