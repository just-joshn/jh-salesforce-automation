import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load .env locally; CI sets these variables itself.
dotenv.config({ path: path.resolve(__dirname, '.env') });

const baseURL = process.env.E2E_BASE_URL ?? 'https://pwa-kit.mobify-storefront.com';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  /* Fail the CI build if a stray test.only slipped in (it would skip everything else). */
  forbidOnly: !!process.env.CI,
  /* Retry on failure: the shared live demo is flaky (slow checkout, network blips) and usually
     passes on a second run. One retry locally, two on CI. */
  retries: process.env.CI ? 2 : 1,
  /* Single worker on CI to avoid hammering the shared demo store. */
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html'], ['list']] : [['html'], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Signs in once and saves the session for the other projects to reuse.
    // Skips itself when no account is configured, so guest-only runs still work.
    {
      name: 'setup',
      testDir: './e2e/setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Guest browsing specs; no stored session.
    {
      name: 'e2e-chromium',
      testDir: './e2e/tests',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    // Direct SCAPI tests; no browser.
    {
      name: 'api',
      testDir: './api/tests',
    },

    // Logged-in specs can opt into the saved session inline:
    //   test.use({ storageState: 'playwright/.auth/user.json' })
    // or uncomment the dedicated project below once those specs exist:
    // {
    //   name: 'e2e-authenticated',
    //   testDir: './e2e/tests',
    //   testMatch: /.*\.auth\.spec\.ts/,
    //   use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
    //   dependencies: ['setup'],
    // },
  ],
});
