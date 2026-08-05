import type { Locator, Page } from '@playwright/test';

// --- Product page the qualifying product is added from ---
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

export const addToCart = (page: Page): Locator =>
  page
    .getByRole('button', { name: /^add to cart$/i })
    .filter({ visible: true })
    .first();

export const addConfirmation = (page: Page): Locator =>
  page
    .getByRole('dialog')
    .filter({ hasText: /added to cart/i })
    .first();

// --- Cart ---
export const cart = (page: Page): Locator => page.getByTestId('sf-cart-container');

export const cartItem = (page: Page, variantId: string): Locator =>
  page.getByTestId(`sf-cart-item-${variantId}`);

/** The promotion's own card in the cart, carrying the callout and the allowance. */
export const allowanceHeading = (page: Page, label: string): Locator =>
  cart(page).getByRole('heading', { name: label, exact: true });

export const selectBonusProducts = (page: Page): Locator =>
  cart(page).getByRole('button', { name: /select bonus products/i });

export const bonusGroupHeading = (page: Page, title: string): Locator =>
  cart(page).getByRole('heading', { name: title, exact: true });

export const bonusItem = (page: Page, variantId: string): Locator =>
  page.getByTestId(`bonus-product-${variantId}`);

/** Every bonus line the cart is holding, to weigh against the allowance. */
export const bonusItems = (page: Page): Locator => cart(page).getByTestId(/^bonus-product-/);

// The bold tag holds the visible price; an aria-live twin repeats it hidden.
export const bonusItemPrice = (page: Page, variantId: string): Locator =>
  bonusItem(page, variantId)
    .locator('b[aria-label*="current price"]')
    .filter({ visible: true })
    .first();

// --- Bonus product chooser ---
export const chooser = (page: Page): Locator =>
  page.locator('[role="dialog"]').filter({ visible: true }).first();

export const chooserHeading = (page: Page, title: string): Locator =>
  chooser(page).getByRole('heading', { name: title, exact: true });

/** One candidate's Select action; every candidate offers the same wording. */
export const candidateSelect = (page: Page): Locator =>
  chooser(page)
    .getByRole('button', { name: /^select$/i })
    .first();

export const candidateFreeLabel = (page: Page, label: string): Locator =>
  chooser(page).getByText(label, { exact: true }).first();

// --- Chosen candidate, configured inside the chooser ---
export const candidateView = (page: Page): Locator => chooser(page).getByTestId('product-view');

export const candidateName = (page: Page): Locator =>
  candidateView(page).getByRole('heading').first();

export const candidatePromoCallout = (page: Page): Locator =>
  chooser(page).getByTestId('promo-callout').first();

const candidateGroup = (page: Page, attribute: string): Locator =>
  chooser(page).getByRole('radiogroup', { name: attribute }).first();

export const candidateSizes = (page: Page): Locator =>
  candidateGroup(page, 'size').getByRole('radio');

export const candidateQuantityIncrement = (page: Page): Locator =>
  chooser(page).getByTestId('quantity-increment');

export const candidateQuantityDecrement = (page: Page): Locator =>
  chooser(page).getByTestId('quantity-decrement');

export const candidateAddToCart = (page: Page): Locator =>
  chooser(page)
    .getByRole('button', { name: /^add to cart$/i })
    .first();
