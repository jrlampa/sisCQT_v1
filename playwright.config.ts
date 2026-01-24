import { defineConfig, devices } from '@playwright/test';

// Evita tratar CI="false"/"0" como true
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const workers = Number(process.env.PLAYWRIGHT_WORKERS || (isCI ? 2 : 4));

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: Number.isFinite(workers) && workers > 0 ? workers : (isCI ? 2 : 4),
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'npm run dev:client',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Para maximizar compatibilidade sem triplicar o tempo, mantemos Firefox também.
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});

