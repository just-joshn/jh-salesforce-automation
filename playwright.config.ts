import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load .env on your machine. CI sets env itself.
dotenv.config({ path: path.resolve(__dirname, '.env') });

const baseURL = process.env.E2E_BASE_URL ?? 'https://pwa-kit.mobify-storefront.com';

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  /* Fail CI if someone left test.only in. */
  forbidOnly: !!process.env.CI,
  /* Retry flaky live-demo fails. 1 try here */
  retries: 1,
  /* One worker on CI so we don't overload the demo shop. */
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html'], ['list']] : [['html'], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'on-first-failure',
    video: 'on-first-retry',
  },
  projects: [],
});
