import { expect, test } from '@playwright/test';
import { dismissConsent, openPath } from '../support/site';
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

test.describe('Storefront visual regression', { tag: ['@nightly', '@visual'] }, () => {
  test('home layout', async ({ page }) => {
    await openPath(page);
    await expect(page.getByRole('main')).toBeVisible();
    await dismissConsent(page, 10_000);
    await expect(page).toHaveScreenshot('home.png', {
      ...screenshotOptions,
      mask: [page.getByText(/© \d{4} Salesforce/)],
    });
  });

  test('search results layout', async ({ page }) => {
    await openPath(page, '/search?q=tie');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: 'tie', exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await dismissConsent(page, 10_000);
    await expect(page).toHaveScreenshot('search-results.png', screenshotOptions);
  });

  test('product detail layout', async ({ page }) => {
    await openPath(page, `/product/${PRODUCTS.hoopEarring.id}`);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(
      page
        .getByRole('heading', { level: 2, name: PRODUCTS.hoopEarring.name, exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
    await dismissConsent(page, 10_000);
    await expect(page).toHaveScreenshot('product-detail.png', screenshotOptions);
  });

  for (const breakpoint of cartBreakpoints) {
    test(`cart layout at ${breakpoint.name}`, async ({ page }) => {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      await openPath(page, '/cart');
      await expect(page.getByRole('main')).toBeVisible();
      await dismissConsent(page, 10_000);
      await expect(page).toHaveScreenshot(`cart-${breakpoint.name}.png`, screenshotOptions);
    });
  }
});
