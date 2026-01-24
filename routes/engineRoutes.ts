import { Router } from 'express';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { CalculateSchema } from '../schemas/engineSchemas.js';
import { ElectricalEngine } from '../services/electricalEngine.js';
import { HttpError } from '../utils/httpError.js';

export const engineRoutes = Router();

function metaDirname(): string {
  // Em runtime normal (Node ESM), `import.meta.url` é `file://...`.
  // Em alguns ambientes de teste/transpilers (ex.: Vitest), pode virar um path `C:/...`.
  const u = import.meta.url;
  return u.startsWith('file:') ? path.dirname(fileURLToPath(u)) : path.dirname(u);
}

function calculateInWorker(payload: any) {
  return new Promise<any>((resolve, reject) => {
    const isProd = process.env.NODE_ENV === 'production';
    const workerExt = isProd ? 'js' : 'ts';
    const workerPath = path.resolve(metaDirname(), `../services/electricalEngineNodeWorker.${workerExt}`);
    const workerUrl = pathToFileURL(workerPath);
    const worker = new Worker(
      workerUrl,
      ({
        type: 'module',
        // Em dev usamos TS via tsx; em prod o worker roda o JS compilado.
        ...(isProd ? {} : { execArgv: ['--import', 'tsx'] }),
      } as any)
    );

    let settled = false;
    const timeoutMs = Number(process.env.ENGINE_WORKER_TIMEOUT_MS || 30_000);

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      worker.terminate();
      reject(new Error('Timeout no worker do motor de cálculo.'));
    }, Number.isFinite(timeoutMs) ? timeoutMs : 30_000);

    worker.once('message', (msg: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      worker.terminate();
      if (msg?.ok) return resolve(msg.result);
      reject(new Error(msg?.error || 'Erro no worker do motor de cálculo.'));
    });

    worker.once('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      worker.terminate();
      reject(err);
    });

    worker.once('exit', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error(`Worker do motor de cálculo finalizou inesperadamente (code=${code}).`));
    });

    worker.postMessage(payload);
  });
}

engineRoutes.post('/calculate', authMiddleware as any, validate(CalculateSchema) as any, async (req, res, next) => {
  const { scenarioId, nodes, params, cables, ips } = req.body;
  try {
    // Default: usar worker para não bloquear o event loop.
    // Opt-out: ENABLE_ENGINE_WORKER=false (útil para debug/local).
    const useWorker = process.env.ENABLE_ENGINE_WORKER !== 'false';

    let result: any;
    if (useWorker) {
      try {
        result = await calculateInWorker({ scenarioId, nodes, params, cables, ips });
      } catch (err) {
        // Fallback controlado: mantém o serviço funcional se o worker falhar por ambiente/config.
        // Pode ser desabilitado com ENABLE_ENGINE_WORKER_STRICT=true.
        if (process.env.ENABLE_ENGINE_WORKER_STRICT === 'true') throw err;
        console.warn('Falha ao executar cálculo no worker; usando fallback síncrono.', err);
        result = ElectricalEngine.calculate(scenarioId, nodes, params, cables, ips);
      }
    } else {
      result = ElectricalEngine.calculate(scenarioId, nodes, params, cables, ips);
    }
    res.json(result);
  } catch (error: any) {
    return next(new HttpError(500, 'Erro no motor de cálculo.', undefined, error));
  }
});

engineRoutes.post('/optimize', authMiddleware as any, (req, res) => {
  const { nodes } = req.body;
  console.log('Optimization requested, returning mock data.');
  res.json(nodes);
});

