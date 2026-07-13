# Storefront CI, Reporting, and Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate the approved PR, nightly, and public-canary tiers with reproducible GitHub Actions jobs, merged reports, failure artifacts, and current repository documentation.

**Architecture:** GitHub Actions selects the target profile and Playwright project rather than embedding endpoint logic in workflows. Playwright emits HTML/JUnit/blob outputs according to an explicit CI reporter mode; nightly shard blobs are merged in a separate job. The public canary has its own read-only spec/project and never shares the destructive staging matrix.

**Tech Stack:** GitHub Actions, Node.js 24, pnpm 11.17.0, Playwright 1.62.1, GitHub artifact actions.

**Spec:** `docs/superpowers/specs/2026-08-26-storefront-quality-portfolio-design.md`

## Global Constraints

- `staging` is the default target; `canary` is selected explicitly with `E2E_TARGET=canary`.
- CI installs with `pnpm install --frozen-lockfile` and uses Node 24 plus pnpm 11.17.0.
- The public canary is read-only and uses `@live`; it must not create accounts, baskets, or orders.
- Full paired suites use real storefront proxy/API traffic and keep unique test data/cleanup.
- CI retries remain enabled only through the existing `CI` configuration; local retries remain zero.
- Sharded jobs use blob reports; reports and failure artifacts use bounded retention.
- No private credentials, tokens, authorization headers, or private secrets are printed or uploaded.
- Workflows use `fail-fast: false` for independent matrix jobs and upload diagnostics when jobs fail.

---

### Task 1: Make CI reporter modes and metadata explicit

**Files:**

- Modify: `playwright.config.ts: reporter, metadata, outputDir`
- Modify: `.gitignore: generated results`
- Modify: `package.json: scripts`

**Interfaces:**

- `PLAYWRIGHT_REPORTER=blob` selects blob + dot + GitHub + JUnit output for shard jobs.
- Normal CI selects HTML + dot + GitHub + JUnit output.
- Local runs continue to select list + HTML.
- Playwright metadata includes target name, target URL, locale, commit, and package Playwright version.

- [ ] **Step 1: Write reporter-mode assertions**

Add a small pure helper in `playwright.config.ts` before the exported config:

```ts
const isCi = Boolean(process.env.CI);
const useBlobReporter = process.env.PLAYWRIGHT_REPORTER === 'blob';

const reporters = isCi
  ? [
      ['dot'],
      ['github'],
      ['junit', { outputFile: 'results/junit.xml', includeProjectInTestName: true }],
      useBlobReporter
        ? ['blob', { outputDir: 'blob-report' }]
        : ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ]
  : [['list'], ['html', { outputFolder: 'playwright-report', open: 'on-failure' }]];
```

Keep the resulting array in the config as `reporter: reporters` and add:

```ts
outputDir: 'test-results',
metadata: {
  target: target.name,
  targetURL: target.baseURL,
  locale: target.locale,
  commit: process.env.GITHUB_SHA ?? 'local',
  playwright: '1.62.1',
},
```

- [ ] **Step 2: Verify local and CI reporter selection without running a suite**

Run:

```bash
pnpm exec playwright test --list --project=e2e
CI=true pnpm exec playwright test --list --project=e2e
CI=true PLAYWRIGHT_REPORTER=blob pnpm exec playwright test --list --project=e2e
```

Expected: all commands list the same tests; no test execution or report directory is required for list mode.

- [ ] **Step 3: Add ignored report directories and scripts**

Append these entries to `.gitignore`:

```gitignore
/results/
```

Ensure `package.json` contains these final commands, retaining commands added by the earlier plans:

```json
"check:target": "node --experimental-strip-types --no-warnings scripts/check-target.mjs",
"test:smoke": "playwright test --grep @smoke",
"test:cross-browser": "playwright test --project=e2e-firefox --project=e2e-webkit --project=mobile-chrome --project=mobile-safari",
"test:a11y": "playwright test --project=a11y",
"test:visual": "playwright test --project=visual",
"test:visual:update": "playwright test --project=visual --update-snapshots",
"test:performance": "playwright test --project=performance",
"test:security": "playwright test --project=security",
"test:quality": "playwright test --project=a11y --project=visual --project=performance --project=security",
"test:canary": "playwright test --project=canary --grep @live"
```

- [ ] **Step 4: Run a reporter smoke test and inspect generated files**

Run:

```bash
E2E_TARGET=staging pnpm exec playwright test --project=e2e --grep 'A1 - Search for a product by keyword'
rm -rf results blob-report playwright-report test-results
CI=true E2E_TARGET=staging pnpm exec playwright test --project=e2e --grep 'A1 - Search for a product by keyword'
```

Expected: the local run creates an HTML report; the CI-mode run creates HTML, JUnit, and failure-oriented output under ignored directories. No authorization value appears in any report file.

- [ ] **Step 5: Commit reporter configuration**

```bash
git add playwright.config.ts .gitignore package.json
git commit -m "test: configure CI reporting modes"
```

### Task 2: Add the public read-only canary project

**Files:**

- Create: `e2e/quality/storefront.canary.spec.ts`
- Modify: `playwright.config.ts: projects`
- Modify: `package.json: scripts`

**Interfaces:**

- Produces a `canary` project matching only `e2e/quality/*.canary.spec.ts`.
- Every canary test carries `@live` and performs only GET/search navigation or config reads.
- `E2E_TARGET=canary pnpm test:canary` is the only supported canary command.

- [ ] **Step 1: Write the read-only canary spec**

Create `e2e/quality/storefront.canary.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { openPath } from '../support/site';
import { PRODUCTS } from '../support/test-data';

test.describe('Public storefront canary', { tag: '@live' }, () => {
  test('serves the public home page', { tag: '@live' }, async ({ page }) => {
    await openPath(page);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByText(PRODUCTS.silkTie.name).first()).toBeVisible();
  });

  test('serves public product search', { tag: '@live' }, async ({ page }) => {
    await openPath(page);
    const searchBox = page.getByRole('searchbox', { name: 'Search for products...' });
    const response = page.waitForResponse((candidate) =>
      candidate.url().includes('search-suggestions'),
    );

    await searchBox.fill('tie');
    expect((await response).status()).toBe(200);
    await searchBox.press('Enter');

    await expect(page).toHaveURL(/\/search\?q=tie/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
```

- [ ] **Step 2: Register the canary project**

Add to `playwright.config.ts`:

```ts
{
  name: 'canary',
  testDir: './e2e/quality',
  testMatch: '**/*.canary.spec.ts',
  use: { ...devices['Desktop Chrome'] },
},
```

- [ ] **Step 3: Verify project isolation and run the canary**

Run:

```bash
pnpm exec playwright test --list --project=canary
E2E_TARGET=canary pnpm check:target
E2E_TARGET=canary pnpm test:canary
```

Expected: exactly two `@live` canary tests are listed and pass without any POST/PUT/PATCH/DELETE application request. The preflight output contains no access token.

- [ ] **Step 4: Commit the canary project**

```bash
git add e2e/quality/storefront.canary.spec.ts playwright.config.ts package.json
git commit -m "test: add public storefront canary"
```

### Task 3: Add the fast pull-request workflow

**Files:**

- Create: `.github/workflows/playwright-pr.yml`

**Interfaces:**

- Runs on pull requests and pushes to `main`.
- Uses `E2E_TARGET=staging` for all test jobs.
- Runs static validation, API smoke, and Chromium E2E smoke independently enough to preserve diagnostics.
- Uploads HTML/JUnit/test-result artifacts even when a test job fails.

- [ ] **Step 1: Create the static validation job**

Create `.github/workflows/playwright-pr.yml` with:

```yaml
name: Playwright PR

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: playwright-pr-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  static:
    name: Static checks
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11.17.0
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check:target
        env:
          E2E_TARGET: staging
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm test:contracts
      - run: pnpm check:title-parity
```

- [ ] **Step 2: Add independent API and Chromium smoke jobs**

Append these jobs to the same workflow:

```yaml
api-smoke:
  name: API smoke
  runs-on: ubuntu-latest
  timeout-minutes: 20
  env:
    CI: true
    E2E_TARGET: staging
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with:
        version: 11.17.0
    - uses: actions/setup-node@v4
      with:
        node-version: 24
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - run: pnpm check:target
    - run: pnpm exec playwright test --project=api --grep @smoke
    - uses: actions/upload-artifact@v4
      if: ${{ !cancelled() }}
      with:
        name: pr-api-report
        path: |
          playwright-report/
          results/
          test-results/
        retention-days: 14

e2e-smoke:
  name: Chromium smoke
  runs-on: ubuntu-latest
  timeout-minutes: 25
  env:
    CI: true
    E2E_TARGET: staging
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with:
        version: 11.17.0
    - uses: actions/setup-node@v4
      with:
        node-version: 24
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - run: pnpm exec playwright install --with-deps chromium
    - run: pnpm check:target
    - run: pnpm exec playwright test --project=e2e --grep @smoke
    - uses: actions/upload-artifact@v4
      if: ${{ !cancelled() }}
      with:
        name: pr-e2e-report
        path: |
          playwright-report/
          results/
          test-results/
        retention-days: 14
```

- [ ] **Step 3: Validate the workflow syntax and commands locally**

Run:

```bash
pnpm exec prettier --check .github/workflows/playwright-pr.yml
E2E_TARGET=staging pnpm check:target
E2E_TARGET=staging pnpm exec playwright test --project=api --grep @smoke --reporter=dot
E2E_TARGET=staging pnpm exec playwright test --project=e2e --grep @smoke --reporter=dot
```

Expected: YAML formatting passes, target preflight passes, and both smoke jobs execute the same commands represented in CI.

- [ ] **Step 4: Commit the PR workflow**

```bash
git add .github/workflows/playwright-pr.yml
git commit -m "ci: add pull request smoke workflow"
```

### Task 4: Add nightly shards, quality matrix, and merged reports

**Files:**

- Create: `.github/workflows/playwright-nightly.yml`

**Interfaces:**

- Runs on a scheduled cron and manual dispatch.
- Full paired suites use two shards per project.
- Browser/device and dedicated quality projects run in an independent matrix.
- A merge job produces one HTML report from all blob reports.

- [ ] **Step 1: Create the full paired-suite matrix**

Create `.github/workflows/playwright-nightly.yml`:

```yaml
name: Playwright Nightly

on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  paired:
    name: Full ${{ matrix.project }} shard ${{ matrix.shard }}
    runs-on: ubuntu-latest
    timeout-minutes: 45
    strategy:
      fail-fast: false
      matrix:
        project: [api, e2e]
        shard: [1, 2]
    env:
      CI: true
      E2E_TARGET: staging
      PLAYWRIGHT_REPORTER: blob
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11.17.0
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm check:target
      - run: pnpm exec playwright test --project=${{ matrix.project }} --shard=${{ matrix.shard }}/2
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: nightly-blob-${{ matrix.project }}-${{ matrix.shard }}
          path: blob-report/
          retention-days: 1
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: nightly-failures-${{ matrix.project }}-${{ matrix.shard }}
          path: |
            test-results/**/*.zip
            test-results/**/*.png
            test-results/**/*.webm
          retention-days: 7
```

- [ ] **Step 2: Add browser/device and quality matrices**

Append:

```yaml
quality:
  name: Quality project ${{ matrix.project }}
  runs-on: ubuntu-latest
  timeout-minutes: 35
  strategy:
    fail-fast: false
    matrix:
      project:
        - e2e-firefox
        - e2e-webkit
        - mobile-chrome
        - mobile-safari
        - a11y
        - visual
        - performance
        - security
  env:
    CI: true
    E2E_TARGET: staging
    PLAYWRIGHT_REPORTER: blob
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with:
        version: 11.17.0
    - uses: actions/setup-node@v4
      with:
        node-version: 24
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - run: pnpm exec playwright install --with-deps chromium firefox webkit
    - run: pnpm check:target
    - run: pnpm exec playwright test --project=${{ matrix.project }}
    - uses: actions/upload-artifact@v4
      if: ${{ !cancelled() }}
      with:
        name: nightly-blob-${{ matrix.project }}
        path: blob-report/
        retention-days: 1
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: nightly-quality-failures-${{ matrix.project }}
        path: |
          test-results/**/*.zip
          test-results/**/*.png
          test-results/**/*.webm
        retention-days: 7
```

- [ ] **Step 3: Add the blob merge job**

Append:

```yaml
merge-reports:
  name: Merge nightly reports
  if: ${{ !cancelled() }}
  needs: [paired, quality]
  runs-on: ubuntu-latest
  timeout-minutes: 15
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with:
        version: 11.17.0
    - uses: actions/setup-node@v4
      with:
        node-version: 24
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - uses: actions/download-artifact@v4
      with:
        pattern: nightly-blob-*
        path: all-blob-reports
        merge-multiple: true
    - run: PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report pnpm exec playwright merge-reports --reporter=html ./all-blob-reports
    - uses: actions/upload-artifact@v4
      with:
        name: nightly-playwright-report
        path: playwright-report/
        retention-days: 14
```

- [ ] **Step 4: Check workflow formatting and matrix collection locally**

Run:

```bash
pnpm exec prettier --check .github/workflows/playwright-nightly.yml
pnpm exec playwright test --list --project=api --project=e2e
pnpm exec playwright test --list --project=e2e-firefox --project=e2e-webkit --project=mobile-chrome --project=mobile-safari
pnpm exec playwright test --list --project=a11y --project=visual --project=performance --project=security
```

Expected: every matrix project lists tests, and the workflow has no unformatted YAML.

- [ ] **Step 5: Commit the nightly workflow**

```bash
git add .github/workflows/playwright-nightly.yml
git commit -m "ci: add nightly quality matrix"
```

### Task 5: Add the scheduled public canary workflow

**Files:**

- Create: `.github/workflows/storefront-canary.yml`

**Interfaces:**

- Runs on a separate schedule and manual dispatch.
- Sets `E2E_TARGET=canary` and runs only `canary`/`@live` tests.
- Uploads HTML, JUnit, and failure diagnostics independently of staging reports.

- [ ] **Step 1: Create the canary workflow**

Create `.github/workflows/storefront-canary.yml`:

```yaml
name: Storefront Canary

on:
  schedule:
    - cron: '30 3 * * *'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  canary:
    name: Public read-only canary
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      CI: true
      E2E_TARGET: canary
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11.17.0
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm check:target
      - run: pnpm test:canary
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: storefront-canary-report
          path: |
            playwright-report/
            results/
            test-results/
          retention-days: 14
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: storefront-canary-failures
          path: |
            test-results/**/*.zip
            test-results/**/*.png
            test-results/**/*.webm
          retention-days: 7
```

- [ ] **Step 2: Verify the canary command is non-destructive**

Run:

```bash
E2E_TARGET=canary pnpm check:target
E2E_TARGET=canary pnpm test:canary -- --reporter=dot
```

Expected: two tests pass. Inspect the Playwright request log or trace and verify no application POST/PUT/PATCH/DELETE request was made.

- [ ] **Step 3: Format and commit the canary workflow**

```bash
pnpm exec prettier --check .github/workflows/storefront-canary.yml
git add .github/workflows/storefront-canary.yml
git commit -m "ci: schedule public storefront canary"
```

### Task 6: Refresh README and environment documentation

**Files:**

- Modify: `README.md`
- Modify: `.env.example`
- Modify: `docs/test-tier-matrix.md`

**Interfaces:**

- README describes both target profiles, root/locale URL behavior, all test commands, CI tiers, browser projects, quality gates, and artifact policy.
- `.env.example` selects `staging` by default and exposes only safe optional overrides.
- Tier documentation matches the metadata applied to both paired suites and the `@live` canary.

- [ ] **Step 1: Update the README opening and target section**

Replace the public-demo-only opening with:

```md
Playwright tests in TypeScript for Salesforce PWA Kit storefronts.

The default target is the official seeded E2E deployment:

<https://scaffold-pwa-extra-features-e2e.mobify-storefront.com/>

The public demo remains an explicit read-only canary:

<https://pwa-kit.mobify-storefront.com>
```

Add an environment table containing:

```md
| Variable                       | Purpose                                                 |
| ------------------------------ | ------------------------------------------------------- |
| `E2E_TARGET`                   | `staging` (default) or `canary`                         |
| `E2E_BASE_URL`                 | Optional safe base-URL override                         |
| `E2E_PATH_STYLE`               | Optional `root` or `site-locale` override               |
| `E2E_LOCALE`                   | Profile locale (`en-GB` staging, `en-US` canary)        |
| `E2E_CURRENCY`                 | Profile currency (`GBP` staging, `USD` canary)          |
| `SFCC_ORG_ID` / `SFCC_SITE_ID` | Optional compatible Commerce target overrides           |
| `SFCC_PRIVATE_CLIENT_ID`       | Safe client identifier for the storefront private proxy |
```

State explicitly that the profile's private SLAS secret is server-side and no saved shopper account is needed.

- [ ] **Step 2: Document commands and tiers**

Add this command section:

````md
## Test tiers

```bash
pnpm check:target
pnpm test:smoke
pnpm test:e2e
pnpm test:api
pnpm test:cross-browser
pnpm test:quality
pnpm test:canary # uses E2E_TARGET=canary
```

`@smoke` is read-only and runs on PRs and alternate browser/device projects.
`@destructive` marks account, basket, wishlist, payment, and order mutations.
`@nightly` marks full or expensive coverage. `@live` is reserved for the
non-destructive public canary. `@boundary` describes an expected service or
configuration boundary and is not a scheduling tier.
````

Add visual snapshot commands:

```bash
pnpm test:visual
pnpm test:visual:update
```

Explain that snapshots are generated on the pinned Linux Chromium environment and are never updated automatically in CI.

- [ ] **Step 3: Document browser projects and artifact policy**

Add a project table listing `e2e`, `api`, `e2e-firefox`, `e2e-webkit`, `mobile-chrome`, `mobile-safari`, `a11y`, `visual`, `performance`, `security`, and `canary`. State that alternate browsers/devices run read-only smoke coverage while the full mutation matrix remains Desktop Chrome/API.

Add the artifact policy:

```md
CI produces HTML, JUnit, GitHub annotations, and (for nightly shards) merged
blob reports. HTML/JUnit reports are retained for 14 days; blobs for 1 day;
traces, screenshots, videos, and visual diffs for 7 days. Reports never contain
access tokens or private secrets.
```

- [ ] **Step 4: Verify documentation consistency**

Run:

```bash
pnpm exec prettier --check README.md .env.example docs/test-tier-matrix.md
pnpm check:title-parity
pnpm typecheck
pnpm lint
pnpm format:check
```

Expected: documented commands match `package.json`, target defaults match `support/targets.ts`, and the README contains no stale statement that the public demo is the default target.

- [ ] **Step 5: Commit documentation**

```bash
git add README.md .env.example docs/test-tier-matrix.md
git commit -m "docs: document storefront quality portfolio"
```

## Plan 3 completion gate

Run the complete local equivalent of the workflows:

```bash
E2E_TARGET=staging pnpm check:target
E2E_TARGET=staging pnpm test:smoke -- --reporter=dot
E2E_TARGET=staging pnpm test:api -- --reporter=dot
E2E_TARGET=staging pnpm test:e2e -- --reporter=dot
E2E_TARGET=staging pnpm test:cross-browser -- --reporter=dot
E2E_TARGET=staging pnpm test:quality -- --reporter=dot
E2E_TARGET=canary pnpm check:target
E2E_TARGET=canary pnpm test:canary -- --reporter=dot
pnpm check:title-parity
pnpm test:contracts
pnpm typecheck
pnpm lint
pnpm format:check
git diff --check
```

Then verify workflow files and clean state:

```bash
pnpm exec prettier --check .github/workflows/playwright-pr.yml .github/workflows/playwright-nightly.yml .github/workflows/storefront-canary.yml
 git status --short
```

Expected: all local gates pass, both profiles preflight successfully, all workflow YAML is formatted, and only intentionally committed project files remain changed.
