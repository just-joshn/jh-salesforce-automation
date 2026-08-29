import { assertNoA11yViolations, expect, test } from './fixtures';
import { dismissConsent, headerSearchBox, openPath } from '../support/site';
import { PRODUCTS } from '../support/test-data';

const pages = [
  { name: 'home', path: '' },
  { name: 'search results', path: '/search?q=tie' },
  { name: 'product detail', path: `/product/${PRODUCTS.hoopEarring.id}` },
  { name: 'empty cart', path: '/cart' },
] as const;

test.describe('Storefront accessibility', { tag: ['@nightly', '@a11y'] }, () => {
  for (const pageCase of pages) {
    test(`${pageCase.name} has no WCAG violations`, async ({ page, makeAxeBuilder }, testInfo) => {
      await openPath(page, pageCase.path);
      await expect(page.getByRole('main')).toBeVisible();
      await dismissConsent(page, 10_000);
      await assertNoA11yViolations(makeAxeBuilder, testInfo);
    });
  }

  test('header search is keyboard operable', async ({ page }) => {
    await openPath(page);
    const searchBox = headerSearchBox(page);

    await searchBox.focus();
    await expect(searchBox).toBeFocused();
    await searchBox.fill('tie');
    await searchBox.press('Enter');

    await expect(page).toHaveURL(/\/search\?q=tie/);
    await expect(page.getByRole('main')).toBeVisible();
  });
});
