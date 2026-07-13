import type { Locator, Page } from '@playwright/test';

export const productList = (page: Page): Locator => page.getByTestId('sf-product-list-page');

// The category title lives in a region screen readers skip, so grab the <h1> directly instead of
// finding it by accessible name.
export const heading = (page: Page): Locator =>
  page.getByTestId('sf-product-list-page').locator('h1').first();

export const productTiles = (page: Page): Locator => page.getByTestId(/^sf-product-tile-/);

export const productLinks = (page: Page): Locator => page.locator('a[href*="/product/"]');

export const firstProductLink = (page: Page): Locator => productLinks(page).first();

// First price on any tile (matches $, £, or €), proving the list renders prices.
export const anyTilePrice = (page: Page): Locator => productTiles(page).getByText(/[$£€]/).first();

export const sortSelect = (page: Page): Locator =>
  page.getByTestId('sf-product-list-sort').getByRole('combobox');

export const pagination = (page: Page): Locator => page.getByTestId('sf-pagination');

export const productDetail = (page: Page): Locator => page.getByTestId('product-details-page');
