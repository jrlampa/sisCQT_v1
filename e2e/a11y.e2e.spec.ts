import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupUiTest, loginAsDev, openDemoProject } from './fixtures/testUtils';

test.beforeEach(async ({ page }) => {
  await setupUiTest(page);
});

async function expectNoSeriousViolations(page: any, excludeSelectors: string[] = []) {
  let builder = new AxeBuilder({ page })
    // Contraste em UI com “glass/blur/gradients” costuma gerar falsos positivos.
    // Mantemos o check em auditoria manual e focamos aqui em violações estruturais.
    .disableRules(['color-contrast']);
  for (const sel of excludeSelectors) builder = builder.exclude(sel);
  const results = await builder.analyze();

  const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''));
  expect(serious, JSON.stringify(serious, null, 2)).toHaveLength(0);
}

test('A11y: Login e Hub sem violações críticas', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Engenharia Digital')).toBeVisible();
  await expectNoSeriousViolations(page);

  await loginAsDev(page);
  await expect(page.getByText(/Hub de Engenharia/i)).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('A11y: Editor e Chatbot sem violações críticas', async ({ page }) => {
  await loginAsDev(page);
  await openDemoProject(page);

  await page.getByRole('link', { name: /Editor de Rede/i }).click();
  await expect(page.getByText(/Editor de Topologia/i)).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.getByRole('link', { name: /Analista IA/i }).click();
  await expect(page.getByText(/Theseus: Inteligência de Rede/i)).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('A11y: GIS (exclui Leaflet) sem violações críticas', async ({ page }) => {
  await loginAsDev(page);
  await openDemoProject(page);

  // Garante que o cálculo já existe (GISView exige result)
  await page.getByRole('link', { name: /Editor de Rede/i }).click();
  await expect(page.getByText(/Editor de Topologia/i)).toBeVisible();

  await page.getByRole('link', { name: /Mapa GIS/i }).click();
  await expect(page.getByText(/Mapa de Rede Geoespacial/i)).toBeVisible();
  await expectNoSeriousViolations(page, ['.leaflet-container']);
});

