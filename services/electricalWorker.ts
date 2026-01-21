
import { ElectricalEngine } from './electricalEngine.ts';

/**
 * Theseus Engine Web Worker
 * Responsável por processar simulações de Monte Carlo e cálculos intensivos
 * sem bloquear a UI thread.
 */

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case 'RUN_MONTE_CARLO': {
        const { nodes, params, cables, ips, iterations } = payload;
        
        // Executa a simulação estocástica no motor
        const result = ElectricalEngine.runMonteCarlo(
          nodes,
          params,
          cables,
          ips,
          iterations || 1000
        );

        self.postMessage({
          type: 'MONTE_CARLO_RESULT',
          payload: result
        });
        break;
      }

      case 'PERFORM_CALCULATION': {
        const { scenarioId, nodes, params, cables, ips } = payload;
        const result = ElectricalEngine.calculate(
          scenarioId,
          nodes,
          params,
          cables,
          ips
        );
        
        self.postMessage({
          type: 'CALCULATION_RESULT',
          payload: result
        });
        break;
      }

      default:
        console.warn(`Worker: Tipo de mensagem desconhecido: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: error instanceof Error ? error.message : 'Erro desconhecido no worker'
    });
  }
};
