import type { Locator, Page } from '@playwright/test';

export const variationGroup = (page: Page, attribute: string): Locator =>
  page.getByRole('radiogroup', { name: attribute });

export const variationOption = (page: Page, attribute: string): Locator =>
  variationGroup(page, attribute).getByRole('radio');

// There's a desktop button and a sticky mobile one, so callers take .first().
export const addToCart = (page: Page): Locator =>
  page.getByRole('button', { name: /^add to cart$/i });

export const addConfirmation = (page: Page): Locator =>
  page.getByRole('dialog').filter({ hasText: /added to cart/i });

export const cartContainer = (page: Page): Locator => page.getByTestId('sf-cart-container');
export const cartItem = (page: Page, variantId: string): Locator =>
  page.getByTestId(`sf-cart-item-${variantId}`);
