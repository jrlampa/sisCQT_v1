import { test, expect } from '@playwright/test';
import { setupUiTest, loginAsDev, openDemoProject } from './fixtures/testUtils';

test.beforeEach(async ({ page }) => {
  await setupUiTest(page);
});

test('Snapshots principais (login/hub/editor/chatbot)', async ({ page }, testInfo) => {
  // Visual snapshots: execute somente em CI ou quando explicitamente habilitado.
  test.skip(!process.env.CI && process.env.RUN_VISUAL !== '1', 'Snapshots visuais desabilitados localmente (use RUN_VISUAL=1).');

  // Mantemos baseline apenas para Chromium (evita duplicar diffs entre engines).
  if (testInfo.project.name !== 'chromium') test.skip('Snapshots apenas no Chromium.');

  await page.goto('/login');
  await expect(page.getByText('Engenharia Digital')).toBeVisible();
  await expect(page).toHaveScreenshot('login.png', { fullPage: true });

  await loginAsDev(page);
  await expect(page.getByText('Projeto Demo', { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('hub.png', { fullPage: true });

  await openDemoProject(page);
  await page.getByRole('link', { name: /Editor de Rede/i }).click();
  await expect(page.getByText(/Editor de Topologia/i)).toBeVisible();
  await expect(page).toHaveScreenshot('editor.png', { fullPage: true });

  await page.getByRole('link', { name: /Analista IA/i }).click();
  await expect(page.getByText(/Theseus: Inteligência de Rede/i)).toBeVisible();
  await expect(page).toHaveScreenshot('chatbot.png', { fullPage: true });
});

