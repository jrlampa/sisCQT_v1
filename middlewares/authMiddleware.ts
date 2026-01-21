
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

/**
 * Middleware de Autenticação Corporativa
 * Suporta modo real (JWT Entra ID) e modo de desenvolvimento (Mock).
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  // MODO DE TESTE / DESENVOLVIMENTO
  // Para ativar: defina ENABLE_MOCK_AUTH=true no ambiente
  if (process.env.ENABLE_MOCK_AUTH === 'true' && authHeader === 'Bearer dev-token-im3') {
    const testEmail = 'teste@im3brasil.com.br';
    const user = await prisma.user.upsert({
      where: { email: testEmail },
      update: { lastLogin: new Date() },
      create: {
        email: testEmail,
        name: 'Desenvolvedor Local',
        role: 'admin',
        plan: 'Enterprise'
      }
    });
    (req as any).user = user;
    return next();
  }

  // MODO PRODUÇÃO (MICROSOFT ENTRA ID)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded: any = jwt.decode(token);

    if (!decoded || (!decoded.upn && !decoded.email && !decoded.preferred_username)) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const userEmail = (decoded.upn || decoded.email || decoded.preferred_username).toLowerCase();

    // Validação de domínio corporativo
    if (!userEmail.endsWith('@im3brasil.com.br')) {
      return res.status(403).json({ error: 'Domínio não autorizado.' });
    }

    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: { lastLogin: new Date() },
      create: {
        email: userEmail,
        name: decoded.name || userEmail.split('@')[0],
        role: 'user',
        plan: 'Enterprise'
      }
    });

    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Falha na autenticação corporativa' });
  }
};
