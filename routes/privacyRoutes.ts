import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/db.js';
import { validate } from '../middlewares/validate.js';
import { HttpError } from '../utils/httpError.js';
import { getStripe } from '../services/stripeService.js';

export const privacyRoutes = Router();

const DeleteAccountSchema = z.object({
  confirm: z.literal(true),
});

privacyRoutes.get('/export', async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return next(new HttpError(401, 'Token não fornecido'));

    const [projects, subscriptions] = await Promise.all([
      prisma.project.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.subscription.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      app: {
        name: 'siSCQT Enterprise AI',
        environment: process.env.NODE_ENV || 'unknown',
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        plan: (user as any).plan ?? null,
        authProvider: (user as any).authProvider ?? null,
        stripeCustomerId: (user as any).stripeCustomerId ?? null,
      },
      data: {
        projects,
        subscriptions,
      },
      processors: [
        'Supabase (PostgreSQL + PostGIS)',
        'Microsoft Entra ID (autenticação)',
        'Google (autenticação, quando habilitado)',
        'Stripe (assinaturas/pagamentos, quando habilitado)',
      ],
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="lgpd_export_${user.id}.json"`);
    return res.json(payload);
  } catch (e: any) {
    return next(new HttpError(500, 'Falha ao exportar dados (LGPD).', undefined, e));
  }
});

privacyRoutes.post('/delete', validate(DeleteAccountSchema) as any, async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return next(new HttpError(401, 'Token não fornecido'));

    // Best-effort: cancelar assinaturas Stripe antes de apagar o vínculo local.
    // Não bloqueia a exclusão se Stripe não estiver configurado/falhar.
    const stripeCustomerId = (user as any).stripeCustomerId as string | null | undefined;
    if (stripeCustomerId && (process.env.STRIPE_SECRET_KEY || '').trim()) {
      try {
        const stripe = getStripe();
        const subs = await prisma.subscription.findMany({
          where: { userId: user.id, provider: 'stripe' },
          select: { subscriptionId: true },
        });
        for (const s of subs) {
          if (s.subscriptionId) {
            try {
              await stripe.subscriptions.cancel(s.subscriptionId);
            } catch {
              // ignore
            }
          }
        }
        try {
          // Opcional: apagar customer (pode falhar se houver objetos vinculados)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (stripe.customers as any).del?.(stripeCustomerId);
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }
    }

    await prisma.$transaction([
      prisma.subscription.deleteMany({ where: { userId: user.id } }),
      prisma.project.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);

    return res.json({ success: true });
  } catch (e: any) {
    // Idempotência: se já não existir, tratamos como sucesso.
    if (e?.name?.startsWith?.('Prisma') && (e as any)?.code === 'P2025') {
      return res.json({ success: true });
    }
    return next(new HttpError(500, 'Falha ao excluir conta (LGPD).', undefined, e));
  }
});

