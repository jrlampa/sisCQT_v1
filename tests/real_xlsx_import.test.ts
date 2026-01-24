import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseXlsxToProject } from '../services/xlsxImportService';
import { ElectricalEngine } from '../services/electricalEngine';

describe('XLSX real: importação + verificação de cálculos', () => {
  const defaultPath = path.resolve(process.cwd(), 'PD_A052989936_CQT REAL.xlsx');
  const realPath = process.env.REAL_XLSX_PATH || defaultPath;
  const exists = fs.existsSync(realPath);

  const maybeIt = exists ? it : it.skip;

  maybeIt('deve importar o XLSX e validar carga diversificada por trecho (TOTAL do XLSX)', async () => {
    const buf = fs.readFileSync(realPath);
    const parsed = await parseXlsxToProject(buf, path.basename(realPath));

    const project = parsed.project;
    const expectedByScenario = parsed.expected?.nodeDistributedKvaByScenario;
    if (!expectedByScenario) {
      throw new Error(
        [
          'Não foi possível extrair a referência por trecho (TOTAL) do XLSX.',
          `Arquivo: ${realPath}`,
          `Abas: ${(parsed.debug?.sheetNames || []).join(', ')}`,
        ].join('\n')
      );
    }

    for (const scenario of project.scenarios) {
      const expectedNodes = expectedByScenario[scenario.id];
      if (!expectedNodes) continue;

      const result = ElectricalEngine.calculate(
        scenario.id,
        scenario.nodes,
        scenario.params,
        project.cables,
        project.ipTypes
      );

      for (const [nodeId, expectedKva] of Object.entries(expectedNodes)) {
        const node = result.nodes.find((n: any) => n.id === nodeId) as any;
        expect(node).toBeDefined();
        // nodeDistributedKva é calculado pelo motor a partir de (mono+bi+tri)*DMDI
        expect(Number(node.nodeDistributedKva || 0)).toBeCloseTo(Number(expectedKva), 2);
      }
    }
  });
});

