# Storefront Quality Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add focused accessibility, visual, performance, and security gates that run against the real seeded storefront without replacing application traffic with mocks.

**Architecture:** Dedicated quality specs live under `e2e/quality/` and are isolated from the 28 paired journey files. Playwright projects select each quality concern independently, while shared target/navigation helpers and real storefront APIs remain the only application data path. Visual checks run only on Desktop Chromium; the other gates use stable Desktop Chromium pages and attach diagnostic evidence.

**Tech Stack:** TypeScript 5.9, Node.js 24, pnpm 11.17.0, Playwright 1.62.1, `@axe-core/playwright`, Zod 4.

**Spec:** `docs/superpowers/specs/2026-08-26-storefront-quality-portfolio-design.md`

## Global Constraints

- Run quality gates against the default `staging` profile unless a workflow explicitly selects `canary`.
- The staging target is shared seeded infrastructure; use stable read-only product/store data and never create accounts, baskets, or orders in quality specs.
- Never mock Salesforce Shopper APIs, the storefront proxy, or application frontend-to-backend communication.
- Mock or block only third-party boundaries when a quality test needs isolation; do not hide application-owned failures.
- Use role/test-id locators, observed readiness, condition-based waits, and no arbitrary sleeps or `networkidle` readiness contracts.
- Accessibility failures include rule, impact, and node evidence; visual snapshots use disabled animations and reviewed baselines.
- Performance budgets are the approved staging thresholds: home TTFB 1,500 ms, DCL 5,000 ms, LCP 4,000 ms, CLS 0.25, 6 MiB; search TTFB 1,500 ms, DCL 6,000 ms, LCP 4,500 ms, CLS 0.25, 7 MiB.
- Security checks are read-only and must not print tokens, authorization headers, or private secrets.
- Quality-only specs do not participate in the 28-test E2E/API title parity check.

---

### Task 1: Add the accessibility fixture and WCAG gate

**Files:**

- Create: `e2e/quality/fixtures.ts`
- Create: `e2e/quality/storefront.a11y.spec.ts`
- Modify: `package.json: devDependencies and scripts`

**Interfaces:**

- Produces `test`, `expect`, `makeAxeBuilder`, and `assertNoA11yViolations` from `e2e/quality/fixtures.ts`.
- `makeAxeBuilder()` returns an `AxeBuilder` configured with `wcag2a`, `wcag2aa`, `wcag21a`, and `wcag21aa`.
- `assertNoA11yViolations(page, testInfo)` attaches `accessibility-violations.json` before failing on any violation.

- [ ] **Step 1: Install the accessibility dependency**

Run:

```bash
pnpm add --save-dev @axe-core/playwright
```

Expected: `package.json` and `pnpm-lock.yaml` contain the dependency and no private/runtime dependency is added.

- [ ] **Step 2: Write the failing accessibility fixture/spec**

Create `e2e/quality/fixtures.ts`:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test as base, type Page, type TestInfo } from '@playwright/test';

export const test = base.extend<{
  makeAxeBuilder: () => AxeBuilder;
}>({
  makeAxeBuilder: async ({ page }, use) => {
    await use(() =>
      new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']),
    );
  },
});

export { expect };

export async function assertNoA11yViolations(page: Page, testInfo: TestInfo): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({ html: node.html, target: node.target })),
  }));

  if (violations.length > 0) {
    await testInfo.attach('accessibility-violations.json', {
      body: JSON.stringify(violations, null, 2),
      contentType: 'application/json',
    });
  }

  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}
```

Create `e2e/quality/storefront.a11y.spec.ts`:

```ts
import { assertNoA11yViolations, expect, test } from './fixtures';
import { openPath } from '../support/site';
import { PRODUCTS } from '../support/test-data';

const pages = [
  { name: 'home', path: '' },
  { name: 'search results', path: '/search?q=tie' },
  { name: 'product detail', path: `/product/${PRODUCTS.hoopEarring.id}` },
  { name: 'empty cart', path: '/cart' },
] as const;

test.describe('Storefront accessibility', { tag: ['@nightly'] }, () => {
  for (const pageCase of pages) {
    test(`${pageCase.name} has no WCAG violations`, async ({ page }, testInfo) => {
      await openPath(page, pageCase.path);
      await expect(page.getByRole('main')).toBeVisible();
      await assertNoA11yViolations(page, testInfo);
    });
  }

  test('header search is keyboard operable', async ({ page }) => {
    await openPath(page);
    const searchBox = page.getByRole('searchbox', { name: 'Search for products...' });

    await searchBox.focus();
    await expect(searchBox).toBeFocused();
    await searchBox.fill('tie');
    await searchBox.press('Enter');

    await expect(page).toHaveURL(/\/search\?q=tie/);
    await expect(page.getByRole('main')).toBeVisible();
  });
});
```

- [ ] **Step 3: Verify the new project is not collected before adding its config**

Run:

```bash
pnpm exec playwright test --project=a11y --list
```

Expected: FAIL with an unknown-project error because the `a11y` project is not yet configured; this confirms the quality spec cannot silently run in the paired `e2e` project.

- [ ] **Step 4: Add the accessibility project and run the gate**

Add this project to `playwright.config.ts`:

```ts
{
  name: 'a11y',
  testDir: './e2e/quality',
  testMatch: '**/*.a11y.spec.ts',
  use: { ...devices['Desktop Chrome'] },
},
```

Run:

```bash
pnpm exec playwright install chromium
E2E_TARGET=staging pnpm exec playwright test --project=a11y --reporter=dot
```

Expected: the five accessibility tests execute only in the `a11y` project. Any violation fails with the attached JSON evidence; no blanket rule exclusion is accepted.

- [ ] **Step 5: Commit the accessibility gate**

```bash
git add e2e/quality/fixtures.ts e2e/quality/storefront.a11y.spec.ts playwright.config.ts package.json pnpm-lock.yaml
git commit -m "test: add accessibility quality gate"
```

### Task 2: Add deterministic visual regression coverage

**Files:**

- Create: `e2e/quality/storefront.visual.spec.ts`
- Create: `e2e/quality/storefront.visual.spec.ts-snapshots/` generated by Playwright
- Modify: `playwright.config.ts: expect and projects`
- Modify: `package.json: scripts`

**Interfaces:**

- Produces a `visual` project using Desktop Chromium only.
- Produces `pnpm test:visual` and `pnpm test:visual:update`.
- Snapshot names are `home.png`, `search-results.png`, `product-detail.png`, and `cart-<breakpoint>.png`.

- [ ] **Step 1: Add the visual test with missing-baseline failure behavior**

Create `e2e/quality/storefront.visual.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { openPath } from '../support/site';
import { PRODUCTS } from '../support/test-data';

const screenshotOptions = {
  animations: 'disabled' as const,
  fullPage: true,
  maxDiffPixelRatio: 0.01,
  threshold: 0.2,
};

const cartBreakpoints = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

test.describe('Storefront visual regression', { tag: ['@nightly'] }, () => {
  test('home layout', async ({ page }) => {
    await openPath(page);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page).toHaveScreenshot('home.png', {
      ...screenshotOptions,
      mask: [page.getByText(/© \d{4} Salesforce/)],
    });
  });

  test('search results layout', async ({ page }) => {
    await openPath(page, '/search?q=tie');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot('search-results.png', screenshotOptions);
  });

  test('product detail layout', async ({ page }) => {
    await openPath(page, `/product/${PRODUCTS.hoopEarring.id}`);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByText(PRODUCTS.hoopEarring.name).first()).toBeVisible();
    await expect(page).toHaveScreenshot('product-detail.png', screenshotOptions);
  });

  for (const breakpoint of cartBreakpoints) {
    test(`cart layout at ${breakpoint.name}`, async ({ page }) => {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      await openPath(page, '/cart');
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page).toHaveScreenshot(`cart-${breakpoint.name}.png`, screenshotOptions);
    });
  }
});
```

- [ ] **Step 2: Run the visual spec to verify missing snapshots fail**

Add the `visual` project and screenshot defaults:

```ts
expect: {
  timeout: 10_000,
  toHaveScreenshot: {
    animations: 'disabled',
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  },
},

{
  name: 'visual',
  testDir: './e2e/quality',
  testMatch: '**/*.visual.spec.ts',
  use: { ...devices['Desktop Chrome'] },
},
```

Run:

```bash
E2E_TARGET=staging pnpm exec playwright test --project=visual --reporter=dot
```

Expected: FAIL with missing-snapshot errors, not selector or navigation errors.

- [ ] **Step 3: Generate and review Linux/Chromium baselines**

Add scripts:

```json
"test:visual": "playwright test --project=visual",
"test:visual:update": "playwright test --project=visual --update-snapshots"
```

Generate baselines from the same Linux Chromium environment used for CI:

```bash
E2E_TARGET=staging pnpm test:visual:update
```

Review every generated PNG and confirm that consent dialogs, timestamps, unexpected error pages, and volatile third-party widgets are not accepted as baselines. If a baseline is wrong, correct the test state and regenerate only that named snapshot.

- [ ] **Step 4: Run visual comparison twice**

Run:

```bash
E2E_TARGET=staging pnpm test:visual -- --reporter=dot
E2E_TARGET=staging pnpm test:visual -- --reporter=dot
```

Expected: both runs pass with no snapshot updates. An intentional visual change must be reviewed in the HTML diff before using `--update-snapshots`.

- [ ] **Step 5: Commit visual coverage and reviewed baselines**

```bash
git add e2e/quality/storefront.visual.spec.ts e2e/quality/storefront.visual.spec.ts-snapshots playwright.config.ts package.json
git commit -m "test: add visual regression coverage"
```

### Task 3: Add browser performance budgets

**Files:**

- Create: `e2e/quality/performance-budgets.ts`
- Create: `e2e/quality/storefront.performance.spec.ts`
- Modify: `playwright.config.ts: projects`
- Modify: `package.json: scripts`

**Interfaces:**

- Produces `PerformanceBudget`, `PerformanceMetrics`, `budgets`, and `measurePage(page)`.
- `measurePage` returns navigation timing, LCP/CLS, and resource transfer metrics without sleeping or waiting for `networkidle`.
- Each test attaches `performance.json` and asserts the budget for its page.

- [ ] **Step 1: Write the failing budget tests and helper**

Create `e2e/quality/performance-budgets.ts`:

```ts
import type { Page } from '@playwright/test';

export interface PerformanceBudget {
  ttfb: number;
  domContentLoaded: number;
  lcp: number;
  cls: number;
  transferredBytes: number;
}

export interface PerformanceMetrics {
  ttfb: number;
  domContentLoaded: number;
  lcp: number | null;
  cls: number;
  transferredBytes: number;
}

export const budgets: Record<'home' | 'search', PerformanceBudget> = {
  home: {
    ttfb: 1_500,
    domContentLoaded: 5_000,
    lcp: 4_000,
    cls: 0.25,
    transferredBytes: 6 * 1024 * 1024,
  },
  search: {
    ttfb: 1_500,
    domContentLoaded: 6_000,
    lcp: 4_500,
    cls: 0.25,
    transferredBytes: 7 * 1024 * 1024,
  },
};

export async function measurePage(page: Page): Promise<PerformanceMetrics> {
  await page.waitForLoadState('load');
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as
      PerformanceNavigationTiming | undefined;
    if (!navigation) {
      throw new Error('No navigation timing entry was recorded');
    }

    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    const layoutShifts = performance.getEntriesByType('layout-shift') as Array<
      PerformanceEntry & { hadRecentInput?: boolean; value?: number }
    >;
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    return {
      ttfb: navigation.responseStart - navigation.requestStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
      lcp: lcpEntries.at(-1)?.startTime ?? null,
      cls: layoutShifts.reduce(
        (sum, entry) => sum + (entry.hadRecentInput ? 0 : (entry.value ?? 0)),
        0,
      ),
      transferredBytes: resources.reduce((sum, resource) => sum + resource.transferSize, 0),
    };
  });
}
```

Create `e2e/quality/storefront.performance.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { openPath } from '../support/site';
import { budgets, measurePage, type PerformanceBudget } from './performance-budgets';

const cases = [
  { name: 'home', path: '' },
  { name: 'search', path: '/search?q=tie' },
] as const;

function assertBudget(
  metrics: Awaited<ReturnType<typeof measurePage>>,
  budget: PerformanceBudget,
): void {
  expect(metrics.ttfb, 'TTFB exceeds budget').toBeLessThanOrEqual(budget.ttfb);
  expect(metrics.domContentLoaded, 'DOM content loaded exceeds budget').toBeLessThanOrEqual(
    budget.domContentLoaded,
  );
  expect(metrics.lcp, 'LCP was not recorded').not.toBeNull();
  expect(metrics.lcp ?? Number.POSITIVE_INFINITY, 'LCP exceeds budget').toBeLessThanOrEqual(
    budget.lcp,
  );
  expect(metrics.cls, 'CLS exceeds budget').toBeLessThanOrEqual(budget.cls);
  expect(metrics.transferredBytes, 'Transferred bytes exceed budget').toBeLessThanOrEqual(
    budget.transferredBytes,
  );
}

test.describe('Storefront performance', { tag: ['@nightly'] }, () => {
  for (const pageCase of cases) {
    test(`${pageCase.name} meets its performance budget`, async ({ page }, testInfo) => {
      await openPath(page, pageCase.path);
      await expect(page.getByRole('main')).toBeVisible();

      const metrics = await measurePage(page);
      await testInfo.attach('performance.json', {
        body: JSON.stringify(
          { page: pageCase.name, metrics, budget: budgets[pageCase.name] },
          null,
          2,
        ),
        contentType: 'application/json',
      });
      assertBudget(metrics, budgets[pageCase.name]);
    });
  }
});
```

- [ ] **Step 2: Run the performance project before registering it**

Run:

```bash
pnpm exec playwright test e2e/quality/storefront.performance.spec.ts --reporter=dot
```

Expected: FAIL because the `performance` project is not configured; the test file must not be collected by the paired `e2e` project.

- [ ] **Step 3: Register the project and command**

Add to `playwright.config.ts`:

```ts
{
  name: 'performance',
  testDir: './e2e/quality',
  testMatch: '**/*.performance.spec.ts',
  use: { ...devices['Desktop Chrome'] },
},
```

Add:

```json
"test:performance": "playwright test --project=performance"
```

- [ ] **Step 4: Run the budgets and inspect attached metrics**

Run three separate runs, preserving the measured JSON from each run:

```bash
E2E_TARGET=staging pnpm test:performance -- --reporter=dot
E2E_TARGET=staging pnpm test:performance -- --reporter=dot
E2E_TARGET=staging pnpm test:performance -- --reporter=dot
```

Expected: both tests pass on each run, LCP is present, and the attached values remain below the approved budgets. If a budget fails, preserve the metric evidence and fix the cause or revise the approved spec with measured rationale; do not hide the assertion.

- [ ] **Step 5: Commit performance coverage**

```bash
git add e2e/quality/performance-budgets.ts e2e/quality/storefront.performance.spec.ts playwright.config.ts package.json
git commit -m "test: add performance budgets"
```

### Task 4: Add read-only security-boundary checks

**Files:**

- Create: `e2e/quality/storefront.security.spec.ts`
- Modify: `playwright.config.ts: projects`
- Modify: `package.json: scripts`

**Interfaces:**

- Produces a `security` project and `pnpm test:security`.
- Header checks assert the observed deployed security policy; XSS checks exercise the real search UI and own proxy.
- No test prints an authorization header or token.

- [ ] **Step 1: Write the failing security specs**

Create `e2e/quality/storefront.security.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { openPath } from '../support/site';

const xssPayload = '"><img src=x onerror=alert(1)>';

test.describe('Storefront security boundaries', { tag: ['@nightly'] }, () => {
  test('root response carries the required security headers', async ({ page }) => {
    const response = await page.goto('/');
    expect(response, 'root response').not.toBeNull();
    const headers = response?.headers() ?? {};

    expect(headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['content-security-policy']).toContain("object-src 'none'");
    expect(headers['content-security-policy']).toContain("base-uri 'self'");
    expect(headers['x-frame-options']).toMatch(/^(SAMEORIGIN|DENY)$/);
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('no-referrer');
  });

  test('private credentials are not exposed in document or request URLs', async ({ page }) => {
    const requestUrls: string[] = [];
    page.on('request', (request) => requestUrls.push(request.url()));

    await openPath(page);
    const document = await page.content();

    expect(document).not.toContain('PWA_KIT_SLAS_CLIENT_SECRET');
    expect(document).not.toContain('client_secret=');
    expect(requestUrls.some((url) => /client_secret|access_token|password/i.test(url))).toBe(false);
  });

  test('search input does not execute reflected XSS', async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { __xssTriggered?: boolean }).__xssTriggered = false;
      window.alert = () => {
        (window as Window & { __xssTriggered?: boolean }).__xssTriggered = true;
      };
    });

    await openPath(page);
    const searchBox = page.getByRole('searchbox', { name: 'Search for products...' });
    await searchBox.fill(xssPayload);
    await searchBox.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=/);

    const executed = await page.evaluate(
      () => (window as Window & { __xssTriggered?: boolean }).__xssTriggered === true,
    );
    expect(executed).toBe(false);
    expect(await page.content()).not.toContain('<img src=x onerror=alert(1)>');
  });
});
```

- [ ] **Step 2: Register the project and command**

Add to `playwright.config.ts`:

```ts
{
  name: 'security',
  testDir: './e2e/quality',
  testMatch: '**/*.security.spec.ts',
  use: { ...devices['Desktop Chrome'] },
},
```

Add:

```json
"test:security": "playwright test --project=security"
```

- [ ] **Step 3: Run the security gate against staging**

Run:

```bash
E2E_TARGET=staging pnpm test:security -- --reporter=dot
```

Expected: all three read-only checks pass. If a deployed header differs, report the exact header/value mismatch and do not weaken the test to make the workflow green.

- [ ] **Step 4: Commit security coverage**

```bash
git add e2e/quality/storefront.security.spec.ts playwright.config.ts package.json
git commit -m "test: add security boundary checks"
```

### Task 5: Run the complete quality-project gate

**Files:**

- Modify: `playwright.config.ts: project ordering`
- Modify: `package.json: scripts`

**Interfaces:**

- Produces `test:quality` for all dedicated quality projects.
- The paired `e2e` and `api` projects remain separately selectable.

- [ ] **Step 1: Add the aggregate quality command**

Add:

```json
"test:quality": "playwright test --project=a11y --project=visual --project=performance --project=security"
```

- [ ] **Step 2: Verify collection boundaries**

Run:

```bash
pnpm exec playwright test --list --project=a11y --project=visual --project=performance --project=security
pnpm exec playwright test --list --project=e2e
pnpm exec playwright test --list --project=api
```

Expected: quality projects list only `e2e/quality/*.a11y|visual|performance|security.spec.ts`; paired projects list only the existing 28 browser/API journeys.

- [ ] **Step 3: Run all quality projects**

Run:

```bash
E2E_TARGET=staging pnpm test:quality -- --reporter=dot
```

Expected: accessibility, visual, performance, and security gates pass and produce their documented attachments/snapshots without creating mutable shopper data.

- [ ] **Step 4: Run static regression checks**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:title-parity
pnpm test:contracts
```

Expected: all checks pass and quality-only files do not alter title parity.

- [ ] **Step 5: Commit aggregate quality configuration**

```bash
git add playwright.config.ts package.json
git commit -m "test: compose storefront quality projects"
```

## Plan 2 completion gate

Run:

```bash
E2E_TARGET=staging pnpm check:target
E2E_TARGET=staging pnpm test:quality -- --reporter=dot
E2E_TARGET=staging pnpm test:cross-browser -- --reporter=dot
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:title-parity
```

Expected: the new quality gates are isolated, evidence-producing, and green before CI workflows are added.
