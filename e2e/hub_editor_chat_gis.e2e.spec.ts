import { test, expect } from '@playwright/test';
import { setupUiTest, loginAsDev, openDemoProject } from './fixtures/testUtils';

test.beforeEach(async ({ page }) => {
  await setupUiTest(page);
});

test('Hub -> abre projeto -> Editor recalcula -> Chatbot responde', async ({ page }) => {
  await loginAsDev(page);

  // Hub: projeto vindo do mock
  await expect(page.getByText('Projeto Demo', { exact: true })).toBeVisible();
  await openDemoProject(page);

  // Monte Carlo sob demanda (novo fluxo no Dashboard)
  await expect(page.getByRole('button', { name: /Rodar Simulação/i })).toBeVisible();
  await page.getByRole('button', { name: /Rodar Simulação/i }).click();
  await expect(page.getByText(/Índice de Estabilidade/i)).toBeVisible();
  await expect(page.getByText(/Risco de Falha/i)).toBeVisible();

  // Vai para Editor
  await page.getByRole('link', { name: /Editor de Rede/i }).click();
  await expect(page.getByText(/Editor de Topologia/i)).toBeVisible();

  // Altera carga mono do P-1 e espera refletir na Corrente (badge)
  // O input "Residencial mono" fica na linha do P-1 (rowIndex=1, col=4)
  const monoInput = page.locator('[data-row="1"][data-col="4"]');
  await expect(monoInput).toBeVisible();
  await monoInput.fill('3');

  // Espera o cálculo mock atualizar (debounce 400ms)
  await expect(page.getByText(/3\.0A/)).toBeVisible();

  // Vai para Chatbot e envia mensagem
  await page.getByRole('link', { name: /Analista IA/i }).click();
  await expect(page.getByText(/Theseus: Inteligência de Rede/i)).toBeVisible();
  await page.getByPlaceholder(/Peça ao Theseus/i).fill('Verifique o ponto mais crítico');
  await page.getByRole('button', { name: '➔' }).click();
  await expect(page.getByText(/Resposta simulada do Theseus/i)).toBeVisible();
});

test('GIS: cria nó via click no mapa (mock API)', async ({ page }) => {
  await loginAsDev(page);
  await openDemoProject(page);

  // Garante que o cálculo já existe (GISView exige result)
  await page.getByRole('link', { name: /Editor de Rede/i }).click();
  await expect(page.getByText(/Editor de Topologia/i)).toBeVisible();

  // Vai para GIS
  await page.getByRole('link', { name: /Mapa GIS/i }).click();
  await expect(page.getByText(/Mapa de Rede Geoespacial/i)).toBeVisible();

  // Dialogs do prompt/confirm usados pelo GISMap (um handler único para evitar double-handle)
  let dialogCount = 0;
  page.on('dialog', async (dialog) => {
    dialogCount += 1;
    if (dialogCount === 1) {
      // prompt: nome do ponto
      await dialog.accept('P-99');
      return;
    }
    if (dialogCount === 2) {
      // confirm: "É um Transformador?"
      await dialog.accept();
      return;
    }
    await dialog.dismiss();
  });

  // Clique no mapa (Leaflet)
  // espera overlay de loading sair, se existir
  await expect(page.getByText(/Sincronizando GIS/i)).toBeHidden({ timeout: 15_000 });
  await page.locator('.leaflet-container').click({ position: { x: 200, y: 200 } });

  // Toast de sucesso
  await expect(page.getByText(/TRAFO criado com sucesso!/i)).toBeVisible();
});

