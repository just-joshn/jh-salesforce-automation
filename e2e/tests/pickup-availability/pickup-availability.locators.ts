import type { Locator, Page } from '@playwright/test';

export const productList = (page: Page): Locator => page.getByTestId('sf-product-list-page');

export const categoryHeading = (page: Page, name: string): Locator =>
  page.getByRole('heading', { name, exact: true });

// The list's result count is the heading that is only a number in parentheses.
export const resultCountHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: /^\(\d+\)$/ });

export const productTiles = (page: Page): Locator => page.getByTestId(/^sf-product-tile-/);

export const productTile = (page: Page, masterId: string): Locator =>
  page.getByTestId(`sf-product-tile-${masterId}`);

export const storeInventoryFilter = (page: Page): Locator =>
  page.getByTestId('sf-store-inventory-filter');

export const inventoryFilterCheckbox = (page: Page): Locator =>
  page.getByTestId('sf-store-inventory-filter-checkbox').first();

// The store finder is a modal; PDP tests found it by the same "Find a Store" title.
export const storeModal = (page: Page): Locator =>
  page.getByRole('dialog').filter({ hasText: 'Find a Store' });

// The only <select> in the modal, and it carries no label element.
export const storeCountry = (page: Page): Locator => storeModal(page).getByRole('combobox');

export const storePostalCode = (page: Page): Locator =>
  storeModal(page).getByPlaceholder('Enter postal code');

export const storeFind = (page: Page): Locator =>
  storeModal(page).getByRole('button', { name: /^find$/i });

export const storeResult = (page: Page, storeName: string): Locator =>
  storeModal(page).getByText(storeName).first();

// Store radios use the Chakra visually-hidden input pattern: a 1px clipped
// <input type="radio"> with no accessible name. The input can be checked but not
// clicked, so the wrapping <label> is the clickable handle. Its input value is
// the store id the Stores API returned, so no store ordering has to be guessed.
export const storeChoice = (page: Page, storeId: string): Locator =>
  storeModal(page).locator(`label.chakra-radio:has(input[value="${storeId}"])`).first();

export const storeRadio = (page: Page, storeId: string): Locator =>
  storeModal(page).locator(`input[type="radio"][value="${storeId}"]`).first();

export const storeModalClose = (page: Page): Locator =>
  storeModal(page).getByRole('button', { name: 'Close', exact: true }).first();

// The applied store filter shows up as a removable chip. Desktop and mobile both
// render the section. Only one is on screen.
export const selectedFilter = (page: Page, name: string): Locator =>
  page.getByRole('button', { name }).filter({ visible: true }).first();

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

// Shelf stock message, e.g. "In stock at Woburn Retail Store".
export const storeStockMessage = (page: Page, storeName: string): Locator =>
  page.getByText(`In stock at ${storeName}`, { exact: true }).first();

// Same visually-hidden radio pattern as the store radios: click the label text,
// assert on the input.
export const pickupOption = (page: Page): Locator =>
  page.getByText('Pick Up in Store', { exact: true }).first();

export const pickupRadio = (page: Page): Locator =>
  page.getByRole('radio', { name: /pick up in store/i }).first();

export const addToCart = (page: Page): Locator =>
  page
    .getByRole('button', { name: /^add to cart$/i })
    .filter({ visible: true })
    .first();
