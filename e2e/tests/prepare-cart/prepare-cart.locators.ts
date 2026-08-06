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

export const cartContainer = (page: Page): Locator => page.getByTestId('sf-cart-container');

export const cartHeading = (page: Page, heading: string): Locator =>
  cartContainer(page).getByRole('heading', { name: heading });

export const deliveryGroup = (page: Page, label: string): Locator =>
  cartContainer(page).getByText(label);

export const cartItem = (page: Page, variantId: string): Locator =>
  page.getByTestId(`sf-cart-item-${variantId}`);

export const itemName = (page: Page, variantId: string, name: string): Locator =>
  cartItem(page, variantId).getByRole('heading', { name });

// The bold tag holds the visible price. An aria-live twin repeats it hidden.
export const itemPrice = (page: Page, variantId: string): Locator =>
  cartItem(page, variantId)
    .locator('b[aria-label*="current price"]')
    .filter({ visible: true })
    .first();

// Each line renders its stepper once per breakpoint. Use the one on screen.
export const itemQuantity = (page: Page, variantId: string): Locator =>
  cartItem(page, variantId)
    .getByLabel('Quantity', { exact: true })
    .filter({ visible: true })
    .first();

// Each line's stepper buttons name the product. The cart renders one per breakpoint.
export const itemQuantityIncrement = (page: Page, variantId: string, name: string): Locator =>
  cartItem(page, variantId)
    .getByRole('button', { name: `Increment Quantity for ${name}` })
    .filter({ visible: true })
    .first();

// Each line keeps its own fulfillment picker. The cart renders one per breakpoint.
export const itemFulfillment = (page: Page, variantId: string): Locator =>
  cartItem(page, variantId).getByTestId('delivery-option-select').filter({ visible: true }).first();

// Pickup stays closed off until the shopper has chosen a store to collect from.
export const itemPickupChoice = (page: Page, variantId: string): Locator =>
  itemFulfillment(page, variantId).locator('option[value="pickup"]');

export const removeItem = (page: Page, variantId: string): Locator =>
  cartItem(page, variantId).getByRole('button', { name: /^remove$/i });

export const removeConfirmation = (page: Page): Locator => page.getByRole('alertdialog');

export const confirmRemove = (page: Page): Locator =>
  removeConfirmation(page).getByRole('button', { name: /yes, remove item/i });

export const orderSummary = (page: Page): Locator => page.getByTestId('sf-order-summary');

// The promo entry point is an accordion: closed it offers the question, opened
// it shows the code box. The panel renders one per breakpoint.
export const promoCodeToggle = (page: Page): Locator =>
  page
    .getByRole('button', { name: /do you have a promo code\?/i })
    .filter({ visible: true })
    .first();

export const promoCodeInput = (page: Page): Locator =>
  page.getByLabel('Promo Code', { exact: true }).filter({ visible: true }).first();

export const proceedToCheckout = (page: Page): Locator =>
  page
    .getByRole('link', { name: /proceed to checkout/i })
    .filter({ visible: true })
    .first();

export const checkoutContainer = (page: Page): Locator => page.getByTestId('sf-checkout-container');
