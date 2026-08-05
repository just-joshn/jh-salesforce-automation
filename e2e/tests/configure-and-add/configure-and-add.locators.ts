import type { Locator, Page } from '@playwright/test';

export const productDetail = (page: Page): Locator => page.getByTestId('product-details-page');

// Scoped to the product view so the Recently Viewed carousel's own option
// pickers don't collide.
export const variationGroup = (page: Page, attribute: string): Locator =>
  page.getByTestId('product-view').getByRole('radiogroup', { name: attribute }).first();

export const colorOption = (page: Page, color: string): Locator =>
  variationGroup(page, 'Color').getByRole('radio', { name: color, exact: true });

// exact so "L" does not match "XL"
export const sizeOption = (page: Page, size: string): Locator =>
  variationGroup(page, 'size').getByRole('radio', { name: size, exact: true });

// The stepper renders once per breakpoint; use the one on screen.
export const quantityInput = (page: Page): Locator =>
  productDetail(page).getByLabel('Quantity', { exact: true }).filter({ visible: true }).first();

export const quantityIncrement = (page: Page): Locator =>
  productDetail(page).getByTestId('quantity-increment').filter({ visible: true }).first();

// The fulfillment radios are the Chakra visually-hidden pattern: the input is a
// clipped 1px box, so the shopper clicks its label text instead.
export const deliveryOption = (page: Page): Locator =>
  page.getByRole('radio', { name: 'Ship to Address', exact: true }).first();

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

export const addedProduct = (page: Page): Locator =>
  addConfirmation(page).getByTestId('product-added');

export const cartContainer = (page: Page): Locator => page.getByTestId('sf-cart-container');

export const cartHeading = (page: Page, heading: string): Locator =>
  cartContainer(page).getByRole('heading', { name: heading });

export const cartItem = (page: Page, variantId: string): Locator =>
  page.getByTestId(`sf-cart-item-${variantId}`);

export const itemQuantity = (page: Page, variantId: string): Locator =>
  cartItem(page, variantId)
    .getByLabel('Quantity', { exact: true })
    .filter({ visible: true })
    .first();

// Each line keeps its own fulfillment picker; the cart renders one per breakpoint.
export const itemFulfillment = (page: Page, variantId: string): Locator =>
  cartItem(page, variantId).getByTestId('delivery-option-select').filter({ visible: true }).first();
