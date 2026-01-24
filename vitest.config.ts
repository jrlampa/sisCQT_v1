
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    // Em Windows, muitos workers podem estourar memória (especialmente com libs grandes).
    // Vitest v4: limites ficam no nível superior (pool rework).
    pool: 'threads',
    minThreads: 1,
    maxThreads: 2,
    exclude: [
      'e2e/**',
      'node_modules/**',
      'dist/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
});
