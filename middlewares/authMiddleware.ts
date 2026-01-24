import type { RequestHandler } from 'express';
import { prisma } from '../utils/db.js';
import { verifyToken } from '../utils/tokenUtils.js';

/**
 * Middleware de Autenticação Corporativa
 * Suporta modo real (JWT Entra ID) e modo de desenvolvimento (Mock).
 */
export const authMiddleware: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers?.authorization;
  const isProd = process.env.NODE_ENV === 'production';

  // MODO DE TESTE / DESENVOLVIMENTO
  // Em produção, mock é sempre desabilitado (Entra-only).
  if (!isProd && process.env.ENABLE_MOCK_AUTH === 'true' && authHeader === 'Bearer dev-token-im3') {
    try {
      const testEmail = 'teste@im3brasil.com.br';
      const user = await prisma.user.upsert({
        where: { email: testEmail },
        update: { plan: 'Enterprise', authProvider: 'ENTRA' },
        create: {
          email: testEmail,
          name: 'Desenvolvedor Local',
          plan: 'Enterprise',
          authProvider: 'ENTRA',
        }
      });
      req.user = user;
      return next();
    } catch (dbError) {
      console.error("Mock Auth DB Error:", dbError);
      return res.status(500).json({ success: false, error: 'Erro de banco de dados no modo de autenticação mock.' });
    }
  }

  // MODO PRODUÇÃO (MICROSOFT ENTRA ID)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await verifyToken(token);

    if (!decoded || (!decoded.upn && !decoded.email && !decoded.preferred_username && !decoded.sub)) {
      return res.status(401).json({ success: false, error: 'Token inválido: faltam claims de utilizador.' });
    }

    const rawEmail = (decoded.upn || decoded.email || decoded.preferred_username || '').toLowerCase();
    const userEmail = rawEmail;
    if (!userEmail) {
      return res.status(401).json({ success: false, error: 'Token inválido: email ausente.' });
    }

    // Regras de negócio:
    // - IM3: só Entra, acesso irrestrito (Enterprise)
    // - Avulsos: Google, plano Free por padrão (pode virar Pro via Stripe)
    const isIm3 = userEmail.endsWith('@im3brasil.com.br');
    const issuer = String((decoded as any).iss || '').toLowerCase();
    const isGoogleIssuer = issuer === 'accounts.google.com' || issuer === 'https://accounts.google.com';
    const authProvider = isGoogleIssuer ? 'GOOGLE' : 'ENTRA';

    if (isIm3 && authProvider === 'GOOGLE') {
      return res.status(403).json({ success: false, error: 'Use Entra ID para contas @im3brasil.com.br.' });
    }

    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {
        name: (decoded as any).name || userEmail.split('@')[0],
        authProvider: authProvider as any,
        plan: isIm3 ? ('Enterprise' as any) : undefined,
      },
      create: {
        email: userEmail,
        name: (decoded as any).name || userEmail.split('@')[0],
        authProvider: authProvider as any,
        plan: (isIm3 ? 'Enterprise' : 'Free') as any,
      }
    });

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ success: false, error: 'Falha na autenticação: O token pode ser inválido ou expirado.' });
  }
};