import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { verifyToken } from '../utils/tokenUtils';

/**
 * Middleware de Autenticação Corporativa
 * Suporta modo real (JWT Entra ID) e modo de desenvolvimento (Mock).
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = (req as any).headers?.authorization;

  // MODO DE TESTE / DESENVOLVIMENTO
  if (process.env.ENABLE_MOCK_AUTH === 'true' && authHeader === 'Bearer dev-token-im3') {
    const testEmail = 'teste@im3brasil.com.br';
    const user = await prisma.user.upsert({
      where: { email: testEmail },
      update: {},
      create: {
        email: testEmail,
        name: 'Desenvolvedor Local',
      }
    });
    (req as any).user = user;
    return next();
  }

  // MODO PRODUÇÃO (MICROSOFT ENTRA ID)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return (res as any).status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await verifyToken(token);

    if (!decoded || (!decoded.upn && !decoded.email && !decoded.preferred_username)) {
      return (res as any).status(401).json({ error: 'Token inválido: faltam claims de utilizador.' });
    }

    const userEmail = (decoded.upn || decoded.email || decoded.preferred_username).toLowerCase();

    if (!userEmail.endsWith('@im3brasil.com.br')) {
      return (res as any).status(403).json({ error: 'Domínio não autorizado.' });
    }

    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {},
      create: {
        email: userEmail,
        name: decoded.name || userEmail.split('@')[0],
      }
    });

    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return (res as any).status(401).json({ error: 'Falha na autenticação: O token pode ser inválido ou expirado.' });
  }
};