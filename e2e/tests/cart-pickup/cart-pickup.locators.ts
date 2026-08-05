import type { Locator, Page } from '@playwright/test';

export const variationGroup = (page: Page, attribute: string): Locator =>
  page.getByRole('radiogroup', { name: attribute });
export const variationOption = (page: Page, attribute: string): Locator =>
  variationGroup(page, attribute).getByRole('radio');
// exact so "L" does not match "XL"
export const sizeOption = (page: Page, size: string): Locator =>
  variationGroup(page, 'size').getByRole('radio', { name: size, exact: true });

export const selectStoreButton = (page: Page): Locator =>
  page.getByRole('button', { name: /select store/i });

export const storeModal = (page: Page): Locator =>
  page.getByRole('dialog').filter({ hasText: 'Find a Store' });
// The only <select> in the dialog, and it carries no label element.
export const storeCountry = (page: Page): Locator => storeModal(page).getByRole('combobox');
export const storePostalCode = (page: Page): Locator =>
  storeModal(page).getByPlaceholder('Enter postal code');
export const storeFind = (page: Page): Locator =>
  storeModal(page).getByRole('button', { name: /^find$/i });
export const storeResult = (page: Page, storeName: string): Locator =>
  storeModal(page).getByText(storeName);
// No user-facing locator is usable here: the store radios render the Chakra
// visually-hidden input pattern (1px clipped <input type="radio"> with no
// accessible name), so getByRole('radio').click() times out on actionability.
// The wrapping <label> is the only clickable, stable handle for a store choice.
export const storeChoice = (page: Page): Locator => storeModal(page).locator('label.chakra-radio');
export const storeModalClose = (page: Page): Locator =>
  storeModal(page).getByRole('button', { name: 'Close', exact: true });

export const selectedStore = (page: Page, storeName: string): Locator => page.getByText(storeName);

export const addToCart = (page: Page): Locator =>
  page.getByRole('button', { name: /^add to cart$/i });
export const addConfirmation = (page: Page): Locator =>
  page.getByRole('dialog').filter({ hasText: /added to cart/i });

export const cartContainer = (page: Page): Locator => page.getByTestId('sf-cart-container');
export const cartItem = (page: Page, variantId: string): Locator =>
  page.getByTestId(`sf-cart-item-${variantId}`);
