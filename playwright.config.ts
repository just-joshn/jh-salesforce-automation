import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import dotenv from 'dotenv';
import { resolveTarget } from './support/targets';

// Loads .env from the current working directory (the repo root for every pnpm script).
dotenv.config();

const target = resolveTarget();
const isCi = Boolean(process.env.CI);
const useBlobReporter = process.env.PLAYWRIGHT_REPORTER === 'blob';

const reporters: ReporterDescription[] = isCi
  ? [
      ['dot'],
      ['github'],
      ['junit', { outputFile: 'results/junit.xml', includeProjectInTestName: true }],
      useBlobReporter
        ? ['blob', { outputDir: 'blob-report' }]
        : ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ]
  : [['list'], ['html', { outputFolder: 'playwright-report', open: 'on-failure' }]];

export default defineConfig({
  testDir: './e2e/tests',
  testMatch: '**/*.spec.ts',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Retries are a CI safety net, not a local crutch: 0 locally so real flakiness is seen
  // and fixed, not masked; 2 in CI to absorb live-site jitter without failing the pipeline.
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? '50%' : undefined,

  reporter: reporters,
  outputDir: 'test-results',
  metadata: {
    target: target.name,
    targetURL: target.baseURL,
    locale: target.locale,
    commit: process.env.GITHUB_SHA ?? 'local',
    playwright: '1.62.1',
  },

  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
    },
  },

  use: {
    baseURL: target.baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: target.locale,
  },

  projects: [
    {
      name: 'e2e',
      testDir: './e2e/tests',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'a11y',
      testDir: './e2e/quality',
      testMatch: '**/*.a11y.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual',
      testDir: './e2e/quality',
      testMatch: '**/*.visual.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'performance',
      testDir: './e2e/quality',
      testMatch: '**/*.performance.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'security',
      testDir: './e2e/quality',
      testMatch: '**/*.security.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'canary',
      testDir: './e2e/quality',
      testMatch: '**/*.canary.spec.ts',
      use: { ...devices['Desktop Chrome'], javaScriptEnabled: false },
    },
    {
      name: 'e2e-firefox',
      testDir: './e2e/tests',
      grep: /@smoke/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'e2e-webkit',
      testDir: './e2e/tests',
      grep: /@smoke/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      testDir: './e2e/tests',
      grep: /@smoke/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      testDir: './e2e/tests',
      grep: /@smoke/,
      use: { ...devices['iPhone 13'] },
    },
    {
      // API-only project: no browser, no device emulation — just Playwright's request
      // context against the storefront's own origin. Mirrors e2e/tests test-for-test;
      // scripts/check-title-parity.mjs enforces that mapping.
      name: 'api',
      testDir: './api/tests',
    },
  ],
});
