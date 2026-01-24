import { parentPort } from 'node:worker_threads';
import { ElectricalEngine } from './electricalEngine.js';

type EngineWorkerOp = 'calculate' | 'optimize' | 'montecarlo';

type BasePayload = {
  scenarioId: string;
  nodes: any[];
  params: any;
  cables: Record<string, any>;
  ips: Record<string, number>;
};

if (!parentPort) {
  throw new Error('Worker inicializado sem parentPort.');
}

parentPort.on('message', (payload: BasePayload & { op?: EngineWorkerOp; iterations?: number; seed?: any }) => {
  try {
    const { op = 'calculate', scenarioId, nodes, params, cables, ips } = payload;

    let result: any;
    if (op === 'calculate') {
      result = ElectricalEngine.calculate(scenarioId, nodes, params, cables, ips);
    } else if (op === 'optimize') {
      result = ElectricalEngine.optimize(scenarioId, nodes, params, cables, ips);
    } else if (op === 'montecarlo') {
      result = ElectricalEngine.runMonteCarlo(nodes, params, cables, ips, payload.iterations, payload.seed);
    } else {
      throw new Error(`Operação inválida no worker: ${String(op)}`);
    }

    parentPort?.postMessage({ ok: true, result });
  } catch (err: any) {
    parentPort?.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido no worker',
    });
  }
});

