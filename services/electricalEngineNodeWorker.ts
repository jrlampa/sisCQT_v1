import { parentPort } from 'node:worker_threads';
import { ElectricalEngine } from './electricalEngine.js';

type CalculatePayload = {
  scenarioId: string;
  nodes: any[];
  params: any;
  cables: Record<string, any>;
  ips: Record<string, number>;
};

if (!parentPort) {
  throw new Error('Worker inicializado sem parentPort.');
}

parentPort.on('message', (payload: CalculatePayload) => {
  try {
    const { scenarioId, nodes, params, cables, ips } = payload;
    const result = ElectricalEngine.calculate(scenarioId, nodes, params, cables, ips);
    parentPort?.postMessage({ ok: true, result });
  } catch (err: any) {
    parentPort?.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido no worker',
    });
  }
});

