import { defineConfig } from '@playwright/test';
import { env } from './src/env';

const CALL_TIMEOUT_MILLISECONDS = 15000;

export default defineConfig({
  testDir: './src',
  fullyParallel: true,
  forbidOnly: env.CI,
  retries: env.CI ? 1 : 0,
  timeout: 60000,
  expect: { timeout: CALL_TIMEOUT_MILLISECONDS },
  reporter: [
    ['list', { printSteps: true }],
    ['html', { open: 'never' }],
  ],
  use: {
    channel: 'chromium',
    actionTimeout: CALL_TIMEOUT_MILLISECONDS,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
