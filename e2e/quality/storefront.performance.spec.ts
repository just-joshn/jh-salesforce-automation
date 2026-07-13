import { expect, test } from '@playwright/test';
import { openPath } from '../support/site';
import { budgets, measurePage, observePage, type PerformanceBudget } from './performance-budgets';

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
      await observePage(page);
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
