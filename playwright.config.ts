import { defineConfig } from '@playwright/test';
import { env } from 'src/env';
import { HTML_REPORT_DIRECTORY, TEST_RESULTS_DIRECTORY } from 'src/utils/paths';

const CALL_TIMEOUT_MILLISECONDS = 15000;

export default defineConfig({
  testDir: './src',
  outputDir: TEST_RESULTS_DIRECTORY,
  globalSetup: './src/global-setup.ts',
  fullyParallel: true,
  forbidOnly: env.CI,
  retries: env.CI ? 1 : 0,
  timeout: 60000,
  expect: { timeout: CALL_TIMEOUT_MILLISECONDS },
  reporter: [['list'], ['html', { open: 'never', outputFolder: HTML_REPORT_DIRECTORY }]],
  use: {
    channel: 'chromium',
    actionTimeout: CALL_TIMEOUT_MILLISECONDS,
    trace: 'retain-on-failure',
    screenshot: 'on',
  },
  projects: [
    { name: 'setup', testMatch: '**/*.setup.ts' },
    { name: 'chromium', dependencies: ['setup'] },
  ],
});
