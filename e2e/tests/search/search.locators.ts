import type { Locator, Page } from '@playwright/test';

// Use the search box that is visible.
export const searchInput = (page: Page): Locator =>
  page.getByPlaceholder('Search for products...').filter({ visible: true }).first();

export const resultsHeading = (page: Page): Locator =>
  page.getByRole('heading', { level: 1 }).first();

export const productList = (page: Page): Locator => page.getByTestId('sf-product-list-page');

export const productTiles = (page: Page): Locator => page.getByTestId(/^sf-product-tile-/);

export const productLinks = (page: Page): Locator => page.locator('a[href*="/product/"]');

export const firstProductLink = (page: Page): Locator => productLinks(page).first();

// Any price on a result tile.
export const anyTilePrice = (page: Page): Locator => productTiles(page).getByText(/[$£€]/).first();

export const productDetail = (page: Page): Locator => page.getByTestId('product-details-page');
