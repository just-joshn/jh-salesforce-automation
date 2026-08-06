import type { Locator, Page } from '@playwright/test';

// Header and mobile drawer both hold a search box. Use the one on screen.
export const searchInput = (page: Page): Locator =>
  page.getByPlaceholder('Search for products...').filter({ visible: true }).first();

export const productList = (page: Page): Locator => page.getByTestId('sf-product-list-page');

// Each tile is rendered as the product anchor, so the tile is the link.
export const productTiles = (page: Page): Locator => page.getByTestId(/^sf-product-tile-/);

export const productTile = (page: Page, masterId: string): Locator =>
  page.getByTestId(`sf-product-tile-${masterId}`);

export const productDetail = (page: Page): Locator => page.getByTestId('product-details-page');

export const productHeading = (page: Page, name: string): Locator =>
  productDetail(page).getByRole('heading', { name });

// The bold tag holds the visible price. The page renders one per breakpoint.
export const currentPrice = (page: Page): Locator =>
  productDetail(page).locator('b[aria-label*="current price"]').filter({ visible: true }).first();

// Alt text of the gallery's full size image ends with the image view type.
export const mainImage = (page: Page): Locator => page.getByAltText(/, large$/).first();

export const promoCallout = (page: Page): Locator => page.getByTestId('promo-callout').first();

// Scoped to the product view so the Recently Viewed carousel's own option
// pickers don't collide.
export const variationGroup = (page: Page, attribute: string): Locator =>
  page.getByTestId('product-view').getByRole('radiogroup', { name: attribute }).first();

export const colorOption = (page: Page, color: string): Locator =>
  variationGroup(page, 'Color').getByRole('radio', { name: color, exact: true });

// exact so "L" does not match "XL"
export const sizeOption = (page: Page, size: string): Locator =>
  variationGroup(page, 'size').getByRole('radio', { name: size, exact: true });

// Desktop and mobile buttons both exist. Only one is on screen.
export const addToCart = (page: Page): Locator =>
  page
    .getByRole('button', { name: /^add to cart$/i })
    .filter({ visible: true })
    .first();
