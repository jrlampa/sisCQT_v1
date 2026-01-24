import fs from 'node:fs';
import path from 'node:path';
import { parseXlsxToProject } from '../services/xlsxImportService';
import { ElectricalEngine } from '../services/electricalEngine';

async function main() {
  const defaultPath = path.resolve(process.cwd(), 'PD_A052989936_CQT REAL.xlsx');
  const realPath = process.env.REAL_XLSX_PATH || defaultPath;
  if (!fs.existsSync(realPath)) {
    console.error(`Arquivo não encontrado: ${realPath}`);
    console.error('Dica: defina REAL_XLSX_PATH ou coloque o XLSX na raiz do repo.');
    process.exit(2);
  }

  const buf = fs.readFileSync(realPath);
  const parsed = await parseXlsxToProject(buf, path.basename(realPath));

  const project = parsed.project;
  const expectedByScenario = parsed.expected?.nodeDistributedKvaByScenario || null;

  console.log('--- XLSX real: verificação ---');
  console.log(`Arquivo: ${realPath}`);
  if (parsed.debug?.scenarioSheetsDetected?.length) {
    console.log(`Aba(s) de cenário detectadas: ${parsed.debug.scenarioSheetsDetected.join(', ')}`);
  } else {
    console.log(`Aba de nós detectada: ${parsed.debug?.nodeSheetPicked || '(n/a)'}`);
  }

  if (!expectedByScenario) {
    console.warn('Referência por trecho (TOTAL) não encontrada no XLSX (expected.nodeDistributedKvaByScenario).');
    process.exit(1);
  }

  let worst = 0;
  let worstKey = '';
  let checked = 0;

  for (const scenario of project.scenarios) {
    const expectedNodes = expectedByScenario[scenario.id];
    if (!expectedNodes) continue;

    const result = ElectricalEngine.calculate(scenario.id, scenario.nodes, scenario.params, project.cables, project.ipTypes);

    for (const [nodeId, expectedKva] of Object.entries(expectedNodes)) {
      const node = result.nodes.find((n: any) => n.id === nodeId) as any;
      const got = Number(node?.nodeDistributedKva || 0);
      const exp = Number(expectedKva);
      const diff = Math.abs(got - exp);
      checked += 1;
      if (diff > worst) {
        worst = diff;
        worstKey = `${scenario.name}:${nodeId}`;
      }
    }
  }

  console.log(`Comparações: ${checked}`);
  console.log(`Pior diferença (abs): ${worst} em ${worstKey || '(n/a)'}`);

  // tolerância simples (kVA) — ajuste se necessário
  if (worst <= 0.01) process.exit(0);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

