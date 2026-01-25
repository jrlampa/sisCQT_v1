import Stripe from 'stripe';

let cachedStripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (cachedStripe) return cachedStripe;
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) throw new Error('Variável de ambiente ausente: STRIPE_SECRET_KEY');
  // Mantemos a versão default do SDK para evitar incompatibilidade de tipos entre releases.
  cachedStripe = new Stripe(key);
  return cachedStripe;
}

export function getAppBaseUrl(): string {
  const url = (process.env.APP_BASE_URL || '').trim();
  if (!url) throw new Error('Variável de ambiente ausente: APP_BASE_URL');
  return url.replace(/\/+$/, '');
}

export function getStripePriceIdPro(): string {
  const priceId = (process.env.STRIPE_PRICE_ID_PRO || '').trim();
  if (!priceId) throw new Error('Variável de ambiente ausente: STRIPE_PRICE_ID_PRO');
  return priceId;
}

