import { test, expect } from '@playwright/test';
import { setupUiTest, loginAsDev } from './fixtures/testUtils';

test.beforeEach(async ({ page }) => {
  await setupUiTest(page);
});

test('Smoke: /privacy e /terms carregam', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Política de Privacidade (LGPD)' })).toBeVisible();

  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Termos de Uso' })).toBeVisible();
});

test('LGPD: “Baixar meus dados” dispara request para /api/privacy/export', async ({ page }) => {
  await loginAsDev(page);
  await page.goto('/billing');

  await expect(page.getByText(/Escolha sua Potência/i)).toBeVisible();

  const [req] = await Promise.all([
    page.waitForRequest((r) => r.url().includes('/api/privacy/export') && r.method() === 'GET'),
    page.getByRole('button', { name: /Baixar meus dados/i }).click(),
  ]);

  expect(req.url()).toContain('/api/privacy/export');
});

