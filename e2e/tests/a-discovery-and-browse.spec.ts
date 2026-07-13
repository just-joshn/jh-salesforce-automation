import { expect, test, type Locator } from '@playwright/test';
import { readAppConfig } from '../support/app-config';
import { openPath } from '../support/site';
import { PRODUCTS } from '../support/test-data';

async function readCount(heading: Locator): Promise<number> {
  const text = (await heading.textContent()) ?? '';
  const match = /\((\d+)\)/.exec(text);
  return match ? Number(match[1]) : NaN;
}

test.describe('A. Discovery & Browse', { tag: '@discovery' }, () => {
  test(
    'A1 - Search for a product by keyword',
    { tag: ['@critical', '@smoke'] },
    async ({ page }) => {
      await openPath(page, '');
      const searchBox = page.getByRole('searchbox', { name: 'Search for products...' });

      await test.step('A matching query returns Einstein-backed suggestions the shopper can see and pick', async () => {
        const suggestions = page.waitForResponse(
          (res) =>
            res.url().includes('search-suggestions') &&
            res.url().includes('includeEinsteinSuggestedPhrases=true'),
        );
        await searchBox.fill('tie');
        expect((await suggestions).status()).toBe(200);

        // The API call alone doesn't prove a shopper sees anything: confirm the suggestions
        // panel actually renders matching, clickable product results. Desktop renders links
        // in a dialog; the responsive header renders product buttons instead.
        const suggestionsPanel = page.getByRole('dialog');
        const productSuggestion = suggestionsPanel
          .getByRole('link', { name: new RegExp(PRODUCTS.silkTie.name) })
          .or(page.getByRole('button', { name: new RegExp(PRODUCTS.silkTie.name) }))
          .first();
        await expect(productSuggestion).toBeVisible();
        if ((page.viewportSize()?.width ?? 0) >= 768) {
          await expect(suggestionsPanel.getByRole('link', { name: 'View All' })).toBeVisible();
        }
      });

      await test.step('Submitting the query lands on a results page with a count heading', async () => {
        const productSearch = page.waitForResponse(
          (res) => res.url().includes('product-search') && res.request().method() === 'GET',
        );
        await searchBox.press('Enter');
        expect((await productSearch).status()).toBe(200);
        await expect(page).toHaveURL(/\/search\?q=tie/);
        await expect(
          page.getByRole('heading', { level: 1 }).filter({ hasText: /^\(\d+\)$/ }),
        ).toBeVisible();
      });

      await test.step('A query with no matches degrades gracefully instead of breaking', async () => {
        await searchBox.fill('zzzz-cuj-no-match-xyz');
        await searchBox.press('Enter');
        const zeroCount = page.getByRole('heading', { level: 1 }).filter({ hasText: '(0)' });
        const noResultsCopy = page.getByText(/couldn.t find|no results/i);
        await expect(zeroCount.or(noResultsCopy).first()).toBeVisible();
      });
    },
  );

  test('A2 - Browse a category and refine by facet', { tag: '@smoke' }, async ({ page }) => {
    await openPath(page, '/category/womens');
    const heading = page.getByRole('heading', { level: 1 }).filter({ hasText: /\(\d+\)/ });
    await expect(heading).toBeVisible();
    const initialCount = await readCount(heading);

    if ((page.viewportSize()?.width ?? 0) < 768) {
      // The responsive category header exposes filter/sort as icon-only controls; the first
      // control opens the filter drawer before the same facet semantics are exercised.
      await page.getByRole('main').getByRole('button').first().click();
    }

    await test.step('Applying a color facet narrows the count and adds a removable chip', async () => {
      const refineResponse = page.waitForResponse(
        (res) => res.url().includes('refine=') && res.request().method() === 'GET',
      );
      await page.getByRole('checkbox', { name: /^Add filter: Black/ }).click();
      expect((await refineResponse).status()).toBe(200);

      await expect.poll(() => readCount(heading)).toBeLessThan(initialCount);
      await expect(page.getByRole('button', { name: /^Remove filter: Black/ })).toBeVisible();
    });

    await test.step('Clear All restores the unfiltered result count', async () => {
      await page.getByRole('button', { name: 'Clear all filters' }).click();
      await expect.poll(() => readCount(heading)).toBe(initialCount);
    });
  });

  test(
    'A3 - Guided Shopping Agent is intentionally absent (config-off complement)',
    { tag: ['@config-off', '@smoke'] },
    async ({ page }) => {
      await openPath(page, '');
      const config = await readAppConfig(page);

      // Compared exactly, never by truthiness — the demo ships this as the *string* "false".
      expect(config.commerceAgent.enabled).toBe('false');
      expect(config.commerceAgent.enableAgentFromHeader).toBe('false');
      expect(config.commerceAgent.enableAgentFromFloatingButton).toBe('false');
      expect(config.commerceAgent.enableAgentFromSearchSuggestions).toBe('false');

      await test.step('No agent affordance renders anywhere, and search still works fully', async () => {
        await expect(page.getByRole('button', { name: /agent/i })).toHaveCount(0);

        const searchBox = page.getByRole('searchbox', { name: 'Search for products...' });
        const suggestions = page.waitForResponse((res) => res.url().includes('search-suggestions'));
        await searchBox.fill('tie');
        expect((await suggestions).status()).toBe(200);
      });
    },
  );
});
