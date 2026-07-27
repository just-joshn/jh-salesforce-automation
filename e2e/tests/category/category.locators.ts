import type { Locator, Page } from '@playwright/test';

export const productList = (page: Page): Locator => page.getByTestId('sf-product-list-page');

// Title is an <h1> (not found by accessible name).
export const heading = (page: Page): Locator =>
  page.getByTestId('sf-product-list-page').locator('h1').first();

export const productTiles = (page: Page): Locator => page.getByTestId(/^sf-product-tile-/);

export const productLinks = (page: Page): Locator => page.locator('a[href*="/product/"]');

export const firstProductLink = (page: Page): Locator => productLinks(page).first();

// Any price on a tile ($ or 12.34).
export const anyTilePrice = (page: Page): Locator =>
  productTiles(page)
    .getByText(/[$£€¥]|USD|GBP|EUR|\d+[.,]\d{2}/)
    .first();

export const sortSelect = (page: Page): Locator =>
  page.getByTestId('sf-product-list-sort').getByRole('combobox');

export const pagination = (page: Page): Locator => page.getByTestId('sf-pagination');

export const productDetail = (page: Page): Locator => page.getByTestId('product-details-page');
