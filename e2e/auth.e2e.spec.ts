import { test, expect } from '@playwright/test';
import { setupUiTest, loginAsDev } from './fixtures/testUtils';

test.beforeEach(async ({ page }) => {
  await setupUiTest(page);
});

test('Login (dev) redireciona para Hub', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Engenharia Digital')).toBeVisible();

  await loginAsDev(page);
  await expect(page.getByText(/Hub de Engenharia/i)).toBeVisible();
});

