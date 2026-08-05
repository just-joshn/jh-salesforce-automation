import type { Locator, Page } from '@playwright/test';

// Two kinds of contract meet on this page. Everything the storefront owns is
// found by its own test ids and headings. The payment sheet's inside is built by
// the Salesforce Payments SDK, so it is reached through the container the
// storefront hands the SDK, and never by a selector this repo invents.

export const productDetail = (page: Page): Locator => page.getByTestId('product-details-page');

const variationGroup = (page: Page, attribute: string): Locator =>
  page.getByTestId('product-view').getByRole('radiogroup', { name: attribute }).first();

export const colorOption = (page: Page, color: string): Locator =>
  variationGroup(page, 'Color').getByRole('radio', { name: color, exact: true });

// exact so "L" does not match "XL"
export const sizeOption = (page: Page, size: string): Locator =>
  variationGroup(page, 'size').getByRole('radio', { name: size, exact: true });

export const addToCartButton = (page: Page): Locator =>
  page
    .getByRole('button', { name: /^add to cart$/i })
    .filter({ visible: true })
    .first();

export const addConfirmation = (page: Page): Locator =>
  page
    .getByRole('dialog')
    .filter({ hasText: /added to cart/i })
    .first();

export const addConfirmationClose = (page: Page): Locator =>
  addConfirmation(page).getByRole('button', { name: 'Close' }).first();

export const miniCart = (page: Page, label: string): Locator =>
  page.getByRole('button', { name: label }).first();

export const openMiniCart = (page: Page): Locator =>
  page.getByRole('button', { name: /my cart/i }).first();

export const cartContainer = (page: Page): Locator => page.getByTestId('sf-cart-container');

export const proceedToCheckout = (page: Page): Locator =>
  page
    .getByRole('link', { name: /proceed to checkout/i })
    .filter({ visible: true })
    .first();

export const checkoutContainer = (page: Page): Locator => page.getByTestId('sf-checkout-container');

// Express payment placement. The storefront renders one wrapper per surface it
// was configured for, and records the layout it asked the SDK for on the wrapper.
export const expressPlacement = (page: Page): Locator => page.getByTestId('sf-payments-express');

export const expressHeading = (page: Page, name: string): Locator =>
  page.getByRole('heading', { name });

export const emailInput = (page: Page): Locator =>
  checkoutContainer(page).getByLabel('Email', { exact: true });

export const checkoutAsGuest = (page: Page): Locator =>
  page.getByRole('button', { name: /checkout as guest/i });

export const editContactInfo = (page: Page): Locator =>
  page.getByRole('button', { name: 'Edit Contact Info' });

const stepCard = (page: Page, title: string): Locator =>
  page
    .locator('[data-testid^="sf-toggle-card-step-"]')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) })
    .first();

export const shippingAddressForm = (page: Page): Locator =>
  stepCard(page, 'Shipping Address').getByTestId('sf-shipping-address-edit-form');

export const firstNameField = (scope: Locator): Locator =>
  scope.getByLabel('First Name', { exact: true });

export const lastNameField = (scope: Locator): Locator =>
  scope.getByLabel('Last Name', { exact: true });

export const phoneField = (scope: Locator): Locator => scope.getByLabel('Phone', { exact: true });

export const countryField = (scope: Locator): Locator =>
  scope.getByLabel('Country', { exact: true });

export const addressLineField = (scope: Locator): Locator =>
  scope.getByLabel('Address', { exact: true });

export const cityField = (scope: Locator): Locator => scope.getByLabel('City', { exact: true });

export const stateField = (scope: Locator): Locator => scope.getByLabel('State', { exact: true });

export const postalCodeField = (scope: Locator): Locator =>
  scope.getByLabel('Zip Code', { exact: true });

export const continueToShippingMethod = (page: Page): Locator =>
  page
    .getByRole('button', { name: /continue to shipping method/i })
    .filter({ visible: true })
    .first();

export const editShippingOptions = (page: Page): Locator =>
  page.getByRole('button', { name: 'Edit Shipping Options' });

export const shippingOptionsForm = (page: Page): Locator =>
  page.getByTestId('sf-checkout-shipping-options-form');

export const continueToPayment = (page: Page): Locator =>
  page.getByRole('button', { name: /continue to payment/i });

/**
 * The payment step, which holds the Salesforce Payments sheet in place of the
 * storefront's own card fields when the feature is on.
 */
export const paymentStep = (page: Page): Locator =>
  page.getByTestId('sf-toggle-card-step-3-content');

/**
 * The sheet's own controls live in whatever elements the SDK mounts, so what this
 * repo owns is the container the storefront hands over — never a selector for the
 * provider's insides.
 */
export const sheetFrames = (page: Page): Locator => paymentStep(page).locator('iframe');

export const reviewOrder = (page: Page): Locator =>
  page.getByRole('button', { name: /review order/i }).first();

export const placeOrder = (page: Page): Locator => page.getByTestId('sf-checkout-place-order-btn');

export const confirmationContainer = (page: Page): Locator =>
  page.getByTestId('sf-checkout-confirmation-container');

export const thankYouHeading = (page: Page): Locator =>
  confirmationContainer(page).getByRole('heading', { name: /thank you for your order/i });

export const orderNumberLine = (page: Page): Locator =>
  confirmationContainer(page)
    .getByText(/order number:/i)
    .first();

export const confirmationText = (page: Page, text: string): Locator =>
  confirmationContainer(page).getByText(text).first();
