import { expect, test } from '@playwright/test';
import { dismissConsent, headerSearchBox, openPath } from '../support/site';

test.describe('A. Discovery & Browse', { tag: '@discovery' }, () => {
  test('A1 - Search for a product by keyword', { tag: ['@critical', '@smoke'] }, async ({
    page,
  }) => {
    await openPath(page, '');
    const searchBox = headerSearchBox(page);

    await test.step('A matching query returns Einstein-backed suggestions the shopper can see and pick', async () => {
      const suggestions = page.waitForResponse(
        (res) =>
          res.url().includes('search-suggestions') &&
          res.url().includes('includeEinsteinSuggestedPhrases=true'),
      );
      await searchBox.fill('tie');
      expect((await suggestions).status()).toBe(200);

    });

    await test.step('Submitting the query lands on a results page with a count heading', async () => {
      const productSearch = page.waitForResponse(
        (res) => res.url().includes('product-search') && res.request().method() === 'GET',
      );
      await searchBox.press('Enter');
      expect((await productSearch).status()).toBe(200);
      await expect(page).toHaveURL(/\/search\?q=tie/);
      await dismissConsent(page);
      await expect(
        page.getByRole('heading', { level: 1 }).filter({ hasText: /\(\d+\)/ }),
      ).toBeVisible();
    });

    await test.step('A query with no matches degrades gracefully instead of breaking', async () => {
      await searchBox.fill('zzzz-cuj-no-match-xyz');
      await searchBox.press('Enter');
      const zeroCount = page.getByRole('heading', { level: 1 }).filter({ hasText: '(0)' });
      const noResultsCopy = page.getByText(/couldn.t find|no results/i);
      await expect(zeroCount.or(noResultsCopy).first()).toBeVisible();
    });
  });
});
