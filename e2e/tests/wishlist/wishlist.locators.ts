import type { Locator, Page } from '@playwright/test';

// --- Product page (the product surface the wishlist action starts from) ---
export const productDetail = (page: Page): Locator => page.getByTestId('product-details-page');

// Scoped to the product view so the Recently Viewed carousel's own option
// pickers don't collide.
const variationGroup = (page: Page, attribute: string): Locator =>
  page.getByTestId('product-view').getByRole('radiogroup', { name: attribute }).first();

export const colorOption = (page: Page, color: string): Locator =>
  variationGroup(page, 'Color').getByRole('radio', { name: color, exact: true });

// exact so "L" does not match "XL"
export const sizeOption = (page: Page, size: string): Locator =>
  variationGroup(page, 'size').getByRole('radio', { name: size, exact: true });

// Exact name so the carousel's "Add <name> to wishlist" hearts don't match.
export const addToWishlist = (page: Page): Locator =>
  page
    .getByRole('button', { name: /^add to wishlist$/i })
    .filter({ visible: true })
    .first();

// A second click on an already-saved item says "Item is already in wishlist";
// both toasts confirm the item is stored.
export const wishlistToast = (page: Page): Locator =>
  page.getByText(/added to wishlist|already in wishlist/i).first();

// --- Account wishlist page ---
export const wishlistPage = (page: Page): Locator => page.getByTestId('account-wishlist-page');

export const wishlistHeading = (page: Page): Locator =>
  wishlistPage(page).getByRole('heading', { name: 'Wishlist', exact: true });

// Skeleton while the customer product list is still loading.
export const wishlistSkeleton = (page: Page): Locator => page.getByTestId('sf-wishlist-skeleton');

export const emptyWishlist = (page: Page): Locator =>
  wishlistPage(page).getByText('No Wishlist Items', { exact: true });

export const itemHeading = (page: Page, productName: string): Locator =>
  wishlistPage(page).getByRole('heading', { name: productName });

// A rendered detail line on the stored item, e.g. "Color: Black".
export const itemDetail = (page: Page, text: string): Locator =>
  wishlistPage(page).getByText(text, { exact: true });

// A fully-chosen variant can go straight to the basket. The accessible name
// carries the product: "Add <name> to cart".
export const itemAddToCart = (page: Page): Locator =>
  wishlistPage(page).getByRole('button', { name: /^add .+ to cart$/i });

// A master product needs options resolved first, so it offers View Options.
export const viewOptions = (page: Page): Locator =>
  wishlistPage(page).getByRole('button', { name: /view options/i });

// --- View Options modal (master product option resolution) ---
export const optionsModal = (page: Page): Locator => page.getByTestId('product-view-modal');

const modalGroup = (page: Page, attribute: string): Locator =>
  optionsModal(page).getByRole('radiogroup', { name: attribute });

export const modalColorOption = (page: Page, color: string): Locator =>
  modalGroup(page, 'Color').getByRole('radio', { name: color, exact: true });

export const modalSizeOption = (page: Page, size: string): Locator =>
  modalGroup(page, 'size').getByRole('radio', { name: size, exact: true });

export const modalAddToCart = (page: Page): Locator =>
  optionsModal(page).getByRole('button', { name: /^add to cart$/i });

export const addedToCartToast = (page: Page): Locator => page.getByText(/added to cart/i).first();

// --- Basket ---
export const cartContainer = (page: Page): Locator => page.getByTestId('sf-cart-container');
export const cartItem = (page: Page, variantId: string): Locator =>
  page.getByTestId(`sf-cart-item-${variantId}`);

// Log Out means a registered session is active.
export const logout = (page: Page): Locator => page.getByText(/log out/i);
