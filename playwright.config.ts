import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load .env on your machine. CI sets env itself.
dotenv.config({ path: path.resolve(__dirname, '.env') });

const baseURL = process.env.E2E_BASE_URL ?? 'https://pwa-kit.mobify-storefront.com';

export default defineConfig({
  testDir: '.',
  /* A journey that checks out against the shared live demo needs more than the 30s default,
     especially on WebKit where hydration lands later. */
  timeout: 120_000,
  expect: { timeout: 15_000 },
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
  // Firefox deliberately omitted: suite targets Chromium and WebKit only. CI installs exactly
  // those two browsers so configured projects and CI browser installs agree.
  projects: [
    { name: 'setup', testDir: './e2e/setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'e2e-chromium',
      testDir: './e2e/tests',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'e2e-webkit',
      testDir: './e2e/tests',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },
    { name: 'api', testDir: './api/tests' },
  ],
});
