import type { Locator, Page } from '@playwright/test';

// One search box serves both desktop and mobile, so filter to the visible one.
export const searchInput = (page: Page): Locator =>
  page.getByPlaceholder('Search for products...').filter({ visible: true }).first();

export const resultsHeading = (page: Page): Locator =>
  page.getByRole('heading', { level: 1 }).first();

export const productList = (page: Page): Locator => page.getByTestId('sf-product-list-page');

export const productTiles = (page: Page): Locator => page.getByTestId(/^sf-product-tile-/);

export const productLinks = (page: Page): Locator => page.locator('a[href*="/product/"]');

export const firstProductLink = (page: Page): Locator => productLinks(page).first();

// Any result tile's first price ($, £, or €); asserts the results show prices at all.
export const anyTilePrice = (page: Page): Locator => productTiles(page).getByText(/[$£€]/).first();

export const productDetail = (page: Page): Locator => page.getByTestId('product-details-page');
