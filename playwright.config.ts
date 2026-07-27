import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load .env on your machine. CI sets env itself.
dotenv.config({ path: path.resolve(__dirname, '.env') });

const baseURL = process.env.E2E_BASE_URL ?? 'https://pwa-kit.mobify-storefront.com';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  /* Fail CI if someone left test.only in. */
  forbidOnly: !!process.env.CI,
  /* Retry flaky live-demo fails. 1 try here, 2 on CI. */
  retries: process.env.CI ? 2 : 1,
  /* One worker on CI so we don't overload the demo shop. */
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html'], ['list']] : [['html'], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Log in once; other tests reuse the session. Skip if no login set.
    {
      name: 'setup',
      testDir: './e2e/setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Browser tests as a guest (not logged in).
    {
      name: 'e2e-chromium',
      testDir: './e2e/tests',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    // API tests. No browser.
    {
      name: 'api',
      testDir: './api/tests',
    },

    // Logged-in tests can reuse the saved session, or enable this project later:
    // {
    //   name: 'e2e-authenticated',
    //   testDir: './e2e/tests',
    //   testMatch: /.*\.auth\.spec\.ts/,
    //   use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
    //   dependencies: ['setup'],
    // },
  ],
});
