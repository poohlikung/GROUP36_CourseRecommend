import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const reportDir = process.env.COURSEHUB_E2E_REPORT_DIR || fileURLToPath(new URL('../reports/e2e/discovery', import.meta.url));

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  outputDir: resolve(reportDir, 'results'),
  reporter: [
    ['list'],
    ['html', { outputFolder: resolve(reportDir, 'html'), open: 'never' }],
    ['junit', { outputFile: resolve(reportDir, 'junit.xml') }],
    ['json', { outputFile: resolve(reportDir, 'results.json') }],
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  use: {
    baseURL: 'http://localhost:15173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host localhost --port 15173 --strictPort',
    cwd: fileURLToPath(new URL('../../code/frontend', import.meta.url)),
    url: 'http://localhost:15173',
    env: { COURSEHUB_API_TARGET: 'http://127.0.0.1:18080' },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
