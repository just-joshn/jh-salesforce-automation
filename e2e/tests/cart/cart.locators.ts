import type { Locator, Page } from '@playwright/test';

export const variationGroup = (page: Page, attribute: string): Locator =>
  page.getByRole('radiogroup', { name: attribute });
export const variationOption = (page: Page, attribute: string): Locator =>
  variationGroup(page, attribute).getByRole('radio');
export const sizeOption = (page: Page, size: string): Locator =>
  variationGroup(page, 'size').getByRole('radio', { name: size });
export const addToCart = (page: Page): Locator =>
  page.getByRole('button', { name: /^add to cart$/i });
export const addConfirmation = (page: Page): Locator =>
  page.getByRole('dialog').filter({ hasText: /added to cart/i });

export const cartContainer = (page: Page): Locator => page.getByTestId('sf-cart-container');
export const cartItem = (page: Page, variantId: string): Locator =>
  page.getByTestId(`sf-cart-item-${variantId}`);

export const itemQuantity = (page: Page, variantId: string): Locator =>
  cartItem(page, variantId).getByRole('spinbutton');
export const itemIncrement = (page: Page, variantId: string): Locator =>
  cartItem(page, variantId).getByTestId('quantity-increment');

export const orderSummary = (page: Page): Locator => page.getByTestId('sf-order-summary');
export const proceedToCheckout = (page: Page): Locator =>
  page.getByRole('link', { name: /proceed to checkout/i });

export const checkoutContainer = (page: Page): Locator => page.getByTestId('sf-checkout-container');
