import { Router } from 'express';
import Stripe from 'stripe';
import { prisma } from '../utils/db.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { HttpError } from '../utils/httpError.js';
import { getAppBaseUrl, getStripe, getStripePriceIdPro } from '../services/stripeService.js';

export const billingRoutes = Router();

function isIm3(email: string): boolean {
  return email.toLowerCase().endsWith('@im3brasil.com.br');
}

function getTosMetadata(): { tosVersion: string; tosUpdatedAt: string } {
  const fallback = '2026-01-25';
  const tosVersion = (process.env.LEGAL_TOS_VERSION || '').trim() || fallback;
  const tosUpdatedAt = (process.env.LEGAL_TOS_UPDATED_AT || '').trim() || tosVersion || fallback;
  return { tosVersion, tosUpdatedAt };
}

billingRoutes.get('/status', authMiddleware as any, async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return next(new HttpError(401, 'Token não fornecido'));

    const sub = await prisma.subscription.findFirst({
      where: { userId: user.id, provider: 'stripe' },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({
      plan: user.plan,
      authProvider: (user as any).authProvider,
      subscription: sub
        ? {
            status: sub.status,
            priceId: sub.priceId,
            currentPeriodEnd: sub.currentPeriodEnd,
          }
        : null,
    });
  } catch (e: any) {
    return next(new HttpError(500, 'Falha ao carregar status de cobrança.', undefined, e));
  }
});

billingRoutes.post('/checkout', authMiddleware as any, async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return next(new HttpError(401, 'Token não fornecido'));

    // IM3 (Enterprise) não precisa de cobrança.
    if (isIm3(user.email) || user.plan === 'Enterprise') {
      return next(new HttpError(400, 'Conta corporativa não requer assinatura.'));
    }

    const stripe = getStripe();
    const baseUrl = getAppBaseUrl();
    const priceId = getStripePriceIdPro();
    const { tosVersion, tosUpdatedAt } = getTosMetadata();

    // Garantir customer
    let customerId = (user as any).stripeCustomerId as string | null | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/billing?success=1`,
      cancel_url: `${baseUrl}/billing?canceled=1`,
      subscription_data: {
        metadata: { userId: user.id, tosVersion, tosUpdatedAt },
      },
      // Clickwrap mínimo: exigir aceite dos Termos no Checkout.
      consent_collection: { terms_of_service: 'required' },
      metadata: { userId: user.id, plan: 'Pro', tosVersion, tosUpdatedAt },
      allow_promotion_codes: true,
    });

    return res.json({ url: session.url });
  } catch (e: any) {
    return next(new HttpError(500, e?.message || 'Falha ao criar checkout.', undefined, e));
  }
});

billingRoutes.post('/portal', authMiddleware as any, async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return next(new HttpError(401, 'Token não fornecido'));

    if (isIm3(user.email) || user.plan === 'Enterprise') {
      return next(new HttpError(400, 'Conta corporativa não requer portal de assinatura.'));
    }

    const customerId = (user as any).stripeCustomerId as string | null | undefined;
    if (!customerId) return next(new HttpError(400, 'Cliente Stripe não encontrado para este usuário.'));

    const stripe = getStripe();
    const baseUrl = getAppBaseUrl();

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/billing`,
    });

    return res.json({ url: portal.url });
  } catch (e: any) {
    return next(new HttpError(500, e?.message || 'Falha ao criar portal.', undefined, e));
  }
});

// Webhook: NÃO usa authMiddleware. Exige STRIPE_WEBHOOK_SECRET e raw body.
billingRoutes.post('/webhook', async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') return next(new HttpError(400, 'stripe-signature ausente'));

    const secret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (!secret) return next(new HttpError(500, 'STRIPE_WEBHOOK_SECRET não configurado'));

    const stripe = getStripe();
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!rawBody) return next(new HttpError(400, 'rawBody ausente (configuração do body parser).'));

    const event = stripe.webhooks.constructEvent(rawBody, sig, secret);

    // Eventos relevantes: checkout.session.completed, customer.subscription.updated/deleted
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = String((session.metadata as any)?.userId || '');
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
      const customerId = typeof session.customer === 'string' ? session.customer : null;

      if (userId && subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price?.id || null;
        // Algumas versões do SDK/types podem não expor `current_period_end` de forma tipada.
        // Mantemos o campo opcional no DB, mas não dependemos dele para o MVP.
        const currentPeriodEnd = null;

        await prisma.subscription.upsert({
          where: { subscriptionId },
          update: {
            status: sub.status,
            customerId: customerId,
            priceId: priceId,
            currentPeriodEnd,
            provider: 'stripe',
          },
          create: {
            provider: 'stripe',
            status: sub.status,
            customerId: customerId,
            subscriptionId,
            priceId: priceId,
            currentPeriodEnd,
            userId,
          },
        });

        // Atualiza plano do usuário
        await prisma.user.update({
          where: { id: userId },
          data: { plan: sub.status === 'active' || sub.status === 'trialing' ? 'Pro' : 'Free' },
        });
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const subscriptionId = sub.id;

      const priceId = sub.items.data[0]?.price?.id || null;
      const currentPeriodEnd = null;
      const customerId = typeof sub.customer === 'string' ? sub.customer : null;
      const status = sub.status;

      const existing = await prisma.subscription.findUnique({ where: { subscriptionId } });
      if (existing) {
        await prisma.subscription.update({
          where: { subscriptionId },
          data: { status, priceId, currentPeriodEnd, customerId },
        });
        await prisma.user.update({
          where: { id: existing.userId },
          data: { plan: status === 'active' || status === 'trialing' ? 'Pro' : 'Free' },
        });
      }
    }

    return res.json({ received: true });
  } catch (e: any) {
    // Stripe exige 400 para falhas de assinatura/parsing
    return next(new HttpError(400, e?.message || 'Webhook inválido.', undefined, e));
  }
});

