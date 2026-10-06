import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', timeout: 180_000, expect: { timeout: 15_000 },
  fullyParallel: false, workers: 1, retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: process.env.TFRENCH_E2E_URL || 'http://127.0.0.1:8089', actionTimeout: 15_000, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
