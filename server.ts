import express from 'express';
import type { Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRoutes } from './routes/authRoutes.js';
import { constantsRoutes } from './routes/constantsRoutes.js';
import { projectRoutes } from './routes/projectRoutes.js';
import { engineRoutes } from './routes/engineRoutes.js';
import { geminiRoutes } from './routes/geminiRoutes.js';
import { gisRoutes } from './routes/gisRoutes.js';
import { healthRoutes } from './routes/healthRoutes.js';
import { importRoutes } from './routes/importRoutes.js';
import { billingRoutes } from './routes/billingRoutes.js';
import { privacyRoutes } from './routes/privacyRoutes.js';
import { authMiddleware } from './middlewares/authMiddleware.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { assertProdAuthConfig } from './utils/tokenUtils.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Proxy (Cloud Run / Azure App Service)
// Necessário para `req.ip` correto (rate limit) e HTTPS detection.
const trustProxyEnv = process.env.TRUST_PROXY;
const trustProxy =
  trustProxyEnv === undefined
    ? (isProd ? 1 : false)
    : (trustProxyEnv === 'true'
        ? true
        : (trustProxyEnv === 'false'
            ? false
            : (Number.isFinite(Number(trustProxyEnv)) ? Number(trustProxyEnv) : (isProd ? 1 : false))));
app.set('trust proxy', trustProxy);

// Entra-only em produção: falhar cedo se envs obrigatórias não estiverem definidas.
assertProdAuthConfig();

// Hardening mínimo (headers + compress)
app.use(helmet({
  // Mantém compatibilidade com recursos cross-origin (mapas, assets) no cenário atual.
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // CSP default do Helmet é bem restritivo (script-src 'self') e quebra MSAL/Google GIS + mapas.
  // Aqui usamos uma CSP allowlist mínima para manter segurança sem bloquear recursos necessários.
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "https://accounts.google.com", "https://apis.google.com"],
      "img-src": ["'self'", "data:", "https:"],
      "style-src": ["'self'", "https:", "'unsafe-inline'"],
      "font-src": ["'self'", "https:", "data:"],
      "connect-src": [
        "'self'",
        "https://login.microsoftonline.com",
        "https://graph.microsoft.com",
        "https://accounts.google.com",
        "https://oauth2.googleapis.com",
        "https://*.supabase.co",
      ],
      "frame-src": ["'self'", "https://login.microsoftonline.com", "https://accounts.google.com"],
    },
  },
}));
app.use(compression());

// 1. MIME Type Middleware - CRÍTICO PARA O PREVIEW
app.use((req, res, next) => {
  if (req.url.endsWith('.tsx') || req.url.endsWith('.ts')) {
    res.type('application/javascript');
  }
  next();
});

// 2. CORS e Headers
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  const origin = req.headers.origin as string | undefined;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Em produção, CORS só para origens explicitamente autorizadas.
  // Em desenvolvimento, espelhamos a Origin (ou '*' quando não houver Origin).
  if (!isProd) {
    res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
    if (origin) res.setHeader('Vary', 'Origin');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '600');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Limites de payload (evita abuso e payloads gigantes)
const jsonBodyLimit = process.env.JSON_BODY_LIMIT || '2mb';
const urlencodedBodyLimit = process.env.URLENCODED_BODY_LIMIT || '2mb';
app.use(express.json({
  limit: jsonBodyLimit,
  verify: (req: any, _res, buf) => {
    // Stripe Webhooks precisam do corpo bruto para validar assinatura.
    if (req.originalUrl === '/api/billing/webhook') {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: urlencodedBodyLimit }));

// Rate limiting básico (principalmente em produção)
const rateLimitDisabled = process.env.RATE_LIMIT_DISABLED === 'true';
if (!rateLimitDisabled) {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
  const max = Number(process.env.RATE_LIMIT_MAX || (isProd ? 300 : 1000));

  app.use('/api', rateLimit({
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 15 * 60 * 1000,
    max: Number.isFinite(max) && max > 0 ? max : (isProd ? 300 : 1000),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ success: false, error: 'Muitas requisições. Tente novamente em instantes.' });
    },
  }));
}

const PORT = process.env.PORT || 8080;

app.use('/api/auth', authRoutes);
app.use('/api/constants', constantsRoutes);
app.use('/api', healthRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api', engineRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/gis', gisRoutes);
app.use('/api/import', authMiddleware, importRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/privacy', authMiddleware, privacyRoutes);

// Static files handling
// Em dev, `__dirname` aponta para a raiz do repo; em prod, para `dist/server`.
const staticDir = isProd ? path.resolve(__dirname, '../client') : path.resolve(__dirname);
app.use(express.static(staticDir));

// SPA Fallback
// A MUDANÇA É AQUI: Trocámos '*' por /.*/ (Express 5 exige Regex ou sintaxe diferente)
app.get(/.*/, (req: Request, res: Response) => {
  if (req.url.startsWith('/api')) return res.status(404).json({ success: false, error: 'API not found' });
  res.sendFile(path.join(staticDir, 'index.html'));
});

// Error handler (fallback)
app.use(errorHandler);

// Em testes (Vitest), evitamos abrir uma porta / manter handles abertos.
// O Supertest consegue exercitar o `app` diretamente sem `listen()`.
const isVitest = process.env.VITEST === 'true' || process.env.VITEST === '1';
if (!isVitest && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`>>> siSCQT Enterprise active on port ${PORT}`);
  });
}

export default app;