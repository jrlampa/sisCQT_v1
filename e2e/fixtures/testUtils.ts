import { expect, type Page } from '@playwright/test';
import { installMockApi } from './mockApi';

export async function setupUiTest(page: Page) {
  await installMockApi(page);

  // Desabilita animações/transições para snapshots estáveis
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        transition: none !important;
        animation: none !important;
        scroll-behavior: auto !important;
      }
    `,
  });
}

export async function loginAsDev(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: /modo desenvolvedor/i }).click();
  await expect(page).toHaveURL(/\/hub$/);
}

export async function openDemoProject(page: Page) {
  // Clica no card do projeto demo (tem texto "Projeto Demo")
  await page.getByText('Projeto Demo', { exact: true }).click();
  await expect(page).toHaveURL(/\/project\/prj-1\/dashboard/);
}

