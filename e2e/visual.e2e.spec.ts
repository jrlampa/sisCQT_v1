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
  // Aguarda imagens dos logos para evitar flakiness (render async).
  await expect(page.getByRole('img', { name: 'siSCQT' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Logo IM3 Brasil' })).toBeVisible();
  await page.waitForFunction(() => {
    const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
    const targets = imgs.filter((i) => (i.alt || '') === 'siSCQT' || (i.alt || '') === 'Logo IM3 Brasil');
    return targets.length >= 2 && targets.every((i) => i.complete && i.naturalWidth > 0);
  });
  await expect(page).toHaveScreenshot('login.png', { fullPage: true, maxDiffPixelRatio: 0.02 });

  await loginAsDev(page);
  await expect(page.getByText('Projeto Demo', { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('hub.png', { fullPage: true, maxDiffPixelRatio: 0.02 });

  await openDemoProject(page);
  await page.getByRole('link', { name: /Editor de Rede/i }).click();
  await expect(page.getByText(/Editor de Topologia/i)).toBeVisible();
  await expect(page).toHaveScreenshot('editor.png', { fullPage: true, maxDiffPixelRatio: 0.02 });

  await page.getByRole('link', { name: /Analista IA/i }).click();
  await expect(page.getByText(/Theseus: Inteligência de Rede/i)).toBeVisible();
  await expect(page).toHaveScreenshot('chatbot.png', { fullPage: true, maxDiffPixelRatio: 0.02 });
});

