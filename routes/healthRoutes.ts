import { Router } from 'express';
import { prisma } from '../utils/db.js';

export const healthRoutes = Router();

healthRoutes.get('/healthz', (_req, res) => {
  return res.status(200).json({ success: true });
});

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  const ms = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 2000;
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      setTimeout(() => reject(new Error(`${label} timeout após ${ms}ms`)), ms);
    }),
  ]);
}

healthRoutes.get('/readyz', async (_req, res) => {
  const timeoutMs = Number(process.env.READYZ_TIMEOUT_MS || 2000);
  // Por padrão, validamos PostGIS (GIS é requisito do app). Permite desligar em ambientes específicos.
  // - undefined => true
  // - "true" => true
  // - "false" => false
  const checkPostgisEnv = process.env.READYZ_CHECK_POSTGIS;
  const checkPostgis = checkPostgisEnv === undefined ? true : checkPostgisEnv === 'true';

  try {
    // Prisma: preferimos unsafe aqui por simplicidade e compatibilidade com mocks em testes.
    const q1 = (prisma as any).$queryRawUnsafe?.('SELECT 1');
    if (!q1) throw new Error('Prisma não expõe $queryRawUnsafe (config inválida?)');
    await withTimeout(Promise.resolve(q1), timeoutMs, 'DB');

    if (checkPostgis) {
      const q2 = (prisma as any).$queryRawUnsafe?.(
        "SELECT 1 FROM pg_extension WHERE extname = 'postgis' LIMIT 1"
      );
      if (!q2) throw new Error('Prisma não expõe $queryRawUnsafe (config inválida?)');
      const extRows: any = await withTimeout(Promise.resolve(q2), timeoutMs, 'PostGIS');
      if (!Array.isArray(extRows) || extRows.length === 0) {
        throw new Error("Extensão PostGIS não encontrada (pg_extension.extname='postgis').");
      }
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    const msg = err?.message ? String(err.message) : 'DB não está pronta.';
    return res.status(503).json({ success: false, error: 'readyz falhou', details: msg });
  }
});

