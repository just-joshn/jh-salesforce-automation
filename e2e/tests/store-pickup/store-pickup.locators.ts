import type { Locator, Page } from '@playwright/test';

export const storeLocatorButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Store Locator', exact: true });

export const storeCountrySelect = (page: Page): Locator =>
  page.getByRole('dialog').getByRole('combobox');

export const storePostalCodeInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Enter postal code', exact: true });

export const findStoreButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Find', exact: true });

export const storeRadio = (page: Page, storeName: string): Locator =>
  page.getByRole('radio', { description: storeName });

// The radio has no accessible name and its sibling carries the description; its parent label is the
// only actionable target because the visually hidden input is covered by that label.
export const storeRadioLabel = (page: Page, storeName: string): Locator =>
  storeRadio(page, storeName).locator('..');

export const closeStoreLocatorButton = (page: Page): Locator =>
  page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true });

export const productHeading = (page: Page, productName: string): Locator =>
  page.getByRole('heading', { name: productName, exact: true, level: 2 });

export const inStockAtStore = (page: Page): Locator => page.getByText(/^In stock at/);

export const outOfStockAtStore = (page: Page): Locator => page.getByText(/^Out of Stock at/);

export const selectedStoreButton = (page: Page, storeName: string): Locator =>
  page.getByRole('button', { name: storeName, exact: true });

export const pickupOption = (page: Page): Locator =>
  page.getByRole('radio', { name: 'Pick Up in Store', exact: true });

export const selectedPickupOption = (page: Page): Locator =>
  page.getByRole('radio', { name: 'Pick Up in Store', exact: true, checked: true });

// Chakra renders fulfillment inputs visually hidden beneath their labels, so click the parent label.
export const pickupOptionLabel = (page: Page): Locator => pickupOption(page).locator('..');

export const addToCartButton = (page: Page): Locator =>
  page.getByRole('button', { name: /^Add(?: Bundle)? to Cart$/ });

export const cartButtonWithCount = (page: Page, itemCount: number): Locator =>
  page.getByRole('button', {
    name: `My cart, number of items: ${itemCount}`,
    exact: true,
    includeHidden: true,
  });

export const cartPickupSummary = (page: Page): Locator =>
  page.getByText(/^Pick Up in Store - \d+ out of \d+ items$/);

export const storeName = (page: Page, name: string): Locator =>
  page.getByText(name, { exact: true });

export const proceedToCheckoutLink = (page: Page): Locator =>
  page.getByRole('link', { name: 'Proceed to Checkout Secure', exact: true });

export const checkoutEmailInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Email', exact: true });

export const checkoutAsGuestButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Checkout as Guest', exact: true });

export const pickupAddressHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: 'Pickup Address & Information', exact: true, level: 2 });

export const cardNumberInput = (page: Page): Locator =>
  page.getByLabel('Card Number', { exact: true });

export const cardholderInput = (page: Page): Locator =>
  page.getByLabel('Name on Card', { exact: true });

export const expirationDateInput = (page: Page): Locator =>
  page.getByLabel('Expiration Date', { exact: true });

export const securityCodeInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Security Code', exact: true });

export const billingFirstNameInput = (page: Page): Locator =>
  page.getByLabel('First Name', { exact: true });

export const billingLastNameInput = (page: Page): Locator =>
  page.getByLabel('Last Name', { exact: true });

export const billingPhoneInput = (page: Page): Locator => page.getByLabel('Phone', { exact: true });

export const billingAddressInput = (page: Page): Locator =>
  page.getByLabel('Address', { exact: true });

export const billingCityInput = (page: Page): Locator => page.getByLabel('City', { exact: true });

export const billingStateSelect = (page: Page): Locator =>
  page.getByLabel('State', { exact: true });

export const billingPostalCodeInput = (page: Page): Locator =>
  page.getByLabel('Zip Code', { exact: true });

export const reviewOrderButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Review Order', exact: true });

export const reviewedCard = (page: Page, maskedSuffix: string): Locator =>
  page.getByText(maskedSuffix, { exact: true });

export const placeOrderButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Place Order', exact: true }).first();

export const confirmationHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: 'Thank you for your order!', exact: true, level: 1 });

export const confirmationOrderNumber = (page: Page): Locator =>
  page.getByText(/^Order Number: \d+$/);

export const pickupDetailsHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: 'Pickup Details', exact: true, level: 2 });

export const pickupAddressConfirmationHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: 'Pickup Address', exact: true, level: 3 });
