import type { Locator, Page } from '@playwright/test';

export const variationGroup = (page: Page, attribute: string): Locator =>
  page.getByRole('radiogroup', { name: attribute });
export const variationOption = (page: Page, attribute: string): Locator =>
  variationGroup(page, attribute).getByRole('radio');
export const sizeOption = (page: Page, size: string): Locator =>
  variationGroup(page, 'size').getByRole('radio', { name: size });

export const selectStoreButton = (page: Page): Locator =>
  page.getByRole('button', { name: /select store/i });

export const storeModal = (page: Page): Locator =>
  page.getByRole('dialog').filter({ hasText: 'Find a Store' });
export const storeCountry = (page: Page): Locator =>
  storeModal(page).locator('select[name="countryCode"]');
export const storePostalCode = (page: Page): Locator =>
  storeModal(page).locator('input[name="postalCode"]');
export const storeFind = (page: Page): Locator =>
  storeModal(page).getByRole('button', { name: /^find$/i });
export const storeResult = (page: Page, storeName: string): Locator =>
  storeModal(page).getByText(storeName);
// Each result is a radio; the clickable part is its label, so target the label.
export const storeChoice = (page: Page): Locator => storeModal(page).locator('label.chakra-radio');
export const storeModalClose = (page: Page): Locator =>
  storeModal(page).getByRole('button', { name: /^close$/i });

export const selectedStore = (page: Page, storeName: string): Locator => page.getByText(storeName);

export const addToCart = (page: Page): Locator =>
  page.getByRole('button', { name: /^add to cart$/i });
export const addConfirmation = (page: Page): Locator =>
  page.getByRole('dialog').filter({ hasText: /added to cart/i });

export const cartContainer = (page: Page): Locator => page.getByTestId('sf-cart-container');
export const cartItem = (page: Page, variantId: string): Locator =>
  page.getByTestId(`sf-cart-item-${variantId}`);
