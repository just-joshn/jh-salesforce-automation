import type { Locator, Page } from '@playwright/test';

export const variationGroup = (page: Page, attribute: string): Locator =>
  page.getByRole('radiogroup', { name: attribute });
export const variationOption = (page: Page, attribute: string): Locator =>
  variationGroup(page, attribute).getByRole('radio');
export const sizeOption = (page: Page, size: string): Locator =>
  variationGroup(page, 'size').getByRole('radio', { name: size });
export const addToCartButton = (page: Page): Locator =>
  page.getByRole('button', { name: /^add to cart$/i });
export const addConfirmation = (page: Page): Locator =>
  page.getByRole('dialog').filter({ hasText: /added to cart/i });

export const checkoutContainer = (page: Page): Locator => page.getByTestId('sf-checkout-container');

// Contact step: email plus the guest-checkout button.
export const emailInput = (page: Page): Locator =>
  checkoutContainer(page).getByLabel('Email', { exact: true });
export const checkoutAsGuest = (page: Page): Locator =>
  page.getByRole('button', { name: /checkout as guest/i });

// Shipping step. Scoped to step 1 so these labels don't also match the billing form's fields.
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

// Payment step. Scoped to step 3 so these fields don't collide with the shipping form.
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

export const confirmationContainer = (page: Page): Locator =>
  page.getByTestId('sf-checkout-confirmation-container');
export const thankYouHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: /thank you for your order/i });
export const orderNumber = (page: Page): Locator => page.getByText(/order number:/i);
