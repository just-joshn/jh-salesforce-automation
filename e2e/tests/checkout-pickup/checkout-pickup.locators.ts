import type { Locator, Page } from '@playwright/test';

// Product configuration.
export const variationGroup = (page: Page, attribute: string): Locator =>
  page.getByRole('radiogroup', { name: attribute });
export const variationOption = (page: Page, attribute: string): Locator =>
  variationGroup(page, attribute).getByRole('radio');
// exact so "L" does not match "XL"
export const sizeOption = (page: Page, size: string): Locator =>
  variationGroup(page, 'size').getByRole('radio', { name: size, exact: true });

// Store finder.
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
// No user-facing locator is usable here: the store radios render the Chakra
// visually-hidden input pattern (1px clipped <input type="radio"> with no
// accessible name), so getByRole('radio').click() times out on actionability.
// The wrapping <label> is the only clickable, stable handle for a store choice.
export const storeChoice = (page: Page): Locator => storeModal(page).locator('label.chakra-radio');
export const storeModalClose = (page: Page): Locator =>
  storeModal(page).getByRole('button', { name: 'Close', exact: true });

// Cart handoff.
export const addToCartButton = (page: Page): Locator =>
  page.getByRole('button', { name: /^add to cart$/i });
export const addConfirmation = (page: Page): Locator =>
  page.getByRole('dialog').filter({ hasText: /added to cart/i });

export const checkoutContainer = (page: Page): Locator => page.getByTestId('sf-checkout-container');

// Contact step: email + guest checkout.
export const emailInput = (page: Page): Locator =>
  checkoutContainer(page).getByLabel('Email', { exact: true });
export const checkoutAsGuest = (page: Page): Locator =>
  page.getByRole('button', { name: /checkout as guest/i });

// Shipping fields (step 1 only).
const shippingStep = (page: Page): Locator => page.getByTestId('sf-toggle-card-step-1-content');
export const shipFirstName = (page: Page): Locator =>
  shippingStep(page).getByLabel('First Name', { exact: true });
export const shipLastName = (page: Page): Locator =>
  shippingStep(page).getByLabel('Last Name', { exact: true });
export const shipPhone = (page: Page): Locator =>
  shippingStep(page).getByLabel('Phone', { exact: true });
export const shipCountry = (page: Page): Locator =>
  shippingStep(page).getByLabel('Country', { exact: true });
export const shipAddress1 = (page: Page): Locator =>
  shippingStep(page).getByLabel('Address', { exact: true });
export const shipCity = (page: Page): Locator =>
  shippingStep(page).getByLabel('City', { exact: true });
export const shipState = (page: Page): Locator =>
  shippingStep(page).getByLabel('State', { exact: true });
export const shipPostal = (page: Page): Locator =>
  shippingStep(page).getByLabel('Zip Code', { exact: true });
export const continueToShipping = (page: Page): Locator =>
  page.getByRole('button', { name: /continue to shipping method/i });

// Payment fields (step 3 only).
const paymentStep = (page: Page): Locator => page.getByTestId('sf-toggle-card-step-3-content');
export const cardNumber = (page: Page): Locator =>
  paymentStep(page).getByLabel('Card Number', { exact: true });
export const cardHolder = (page: Page): Locator =>
  paymentStep(page).getByLabel('Name on Card', { exact: true });
export const cardExpiry = (page: Page): Locator =>
  paymentStep(page).getByLabel('Expiration Date', { exact: true });
export const cardSecurityCode = (page: Page): Locator =>
  paymentStep(page).getByLabel('Security Code', { exact: true });
export const reviewOrderButton = (page: Page): Locator =>
  page.getByRole('button', { name: /review order/i });
export const placeOrderButton = (page: Page): Locator =>
  page.getByRole('button', { name: /place order/i });

// Confirmation.
export const confirmationContainer = (page: Page): Locator =>
  page.getByTestId('sf-checkout-confirmation-container');
export const orderNumber = (page: Page): Locator => page.getByText(/order number:/i);
