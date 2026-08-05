import type { Locator, Page } from '@playwright/test';

export const productList = (page: Page): Locator => page.getByTestId('sf-product-list-page');

// The category title is the page's only level-1 heading.
export const heading = (page: Page): Locator =>
  productList(page).getByRole('heading', { level: 1 }).first();

// Each tile is rendered as the product anchor, so the tile is the link.
export const productTiles = (page: Page): Locator => page.getByTestId(/^sf-product-tile-/);

export const firstProductLink = (page: Page): Locator => productTiles(page).first();

// Any price on a tile ($ or 12.34).
export const anyTilePrice = (page: Page): Locator =>
  productTiles(page)
    .getByText(/[$£€¥]|USD|GBP|EUR|\d+[.,]\d{2}/)
    .first();

export const sortSelect = (page: Page): Locator =>
  page.getByTestId('sf-product-list-sort').getByRole('combobox');

export const pagination = (page: Page): Locator => page.getByTestId('sf-pagination');

export const productDetail = (page: Page): Locator => page.getByTestId('product-details-page');
