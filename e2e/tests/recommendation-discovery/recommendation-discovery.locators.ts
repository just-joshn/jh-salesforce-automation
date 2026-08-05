import type { Locator, Page } from '@playwright/test';

// --- Product page the recommendation zone sits on ---
export const productDetail = (page: Page): Locator => page.getByTestId('product-details-page');

export const productHeading = (page: Page, name: string): Locator =>
  page.getByTestId('product-view').getByRole('heading', { name, exact: true }).first();

// --- Recommendation zone ---
// Several zones render on one page and share the same test id, so the heading is
// what picks one out.
export const recommendationZone = (page: Page, title: string): Locator =>
  page
    .getByTestId('product-scroller')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) })
    .first();

export const zoneHeading = (page: Page, title: string): Locator =>
  recommendationZone(page, title).getByRole('heading', { name: title, exact: true });

export const recommendedTiles = (page: Page, title: string): Locator =>
  recommendationZone(page, title).getByTestId('product-scroller-item');

export const recommendedTile = (page: Page, title: string): Locator =>
  recommendedTiles(page, title).first();

// The heart cannot live inside the tile's own link, so it is a sibling in the
// same card and lines up with the tile by position.
export const recommendedTileWishlist = (page: Page, title: string): Locator =>
  recommendationZone(page, title).getByTestId('wishlist-button').first();

export const wishlistToast = (page: Page): Locator =>
  page.getByText(/added to wishlist|already in wishlist/i).first();

// --- Account wishlist ---
export const wishlistPage = (page: Page): Locator => page.getByTestId('account-wishlist-page');

export const wishlistHeading = (page: Page): Locator =>
  wishlistPage(page).getByRole('heading', { name: 'Wishlist', exact: true });

export const wishlistSkeleton = (page: Page): Locator => page.getByTestId('sf-wishlist-skeleton');

export const emptyWishlist = (page: Page): Locator =>
  wishlistPage(page).getByText('No Wishlist Items', { exact: true });

export const wishlistItemHeading = (page: Page, name: string): Locator =>
  wishlistPage(page).getByRole('heading', { name });

// Log Out only renders for a signed-in shopper.
export const logout = (page: Page): Locator => page.getByText(/log out/i);
