import type { Locator, Page } from '@playwright/test';

export const productHeading = (page: Page, productName: string): Locator =>
  page.getByRole('heading', { name: productName, exact: true, level: 2 });

// BUNDLE and SET masters expose "Add Bundle to Cart"; this strict label rejects them.
export const addToCartButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Add to Cart', exact: true });

export const viewCartLink = (page: Page): Locator =>
  page.getByRole('link', { name: 'View Cart', exact: true });

export const cartButton = (page: Page): Locator =>
  page.getByRole('button', { name: /^My cart, number of items: \d+$/ });

export const cartProduct = (page: Page, productName: string): Locator =>
  page.getByRole('link', { name: productName, exact: true });

export const proceedToCheckoutLink = (page: Page): Locator =>
  page.getByRole('link', { name: /^Proceed to Checkout(?: Secure)?$/ });

export const checkoutHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: 'Checkout', exact: true, level: 1 });

export const oneClickEntry = (page: Page): Locator =>
  page.getByText('One Click Checkout', { exact: true });

export const checkoutEmailInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Email', exact: true });

export const secureLinkButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Secure Link', exact: true });

export const otpInputs = (page: Page): Locator =>
  page.getByRole('dialog').getByRole('textbox');

export const accountButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'My Account', exact: true });

export const createAccountOption = (page: Page): Locator =>
  page.getByRole('dialog').getByRole('button', { name: 'Create account', exact: true });

export const firstNameInput = (page: Page): Locator =>
  page.getByRole('dialog').getByRole('textbox', { name: 'First Name', exact: true });

export const lastNameInput = (page: Page): Locator =>
  page.getByRole('dialog').getByRole('textbox', { name: 'Last Name', exact: true });

export const registrationEmailInput = (page: Page): Locator =>
  page.getByRole('dialog').getByRole('textbox', { name: 'Email', exact: true });

export const passwordInput = (page: Page): Locator =>
  page.getByRole('dialog').getByRole('textbox', { name: 'Password', exact: true });

export const createAccountButton = (page: Page): Locator =>
  page.getByRole('dialog').getByRole('button', { name: 'Create Account', exact: true });

export const authenticatedAccountMenu = (page: Page): Locator =>
  page.getByRole('button', { name: 'Open account menu', exact: true });

export const accountHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: 'My Account', exact: true, level: 1 });

export const firstNameShippingInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'First Name', exact: true });

export const lastNameShippingInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Last Name', exact: true });

export const phoneInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Phone', exact: true });

export const addressInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Address', exact: true });

export const cityInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'City', exact: true });

export const stateSelect = (page: Page): Locator => page.getByLabel('State', { exact: true });

export const zipCodeInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Zip Code', exact: true });

export const continueToShippingButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Continue to Shipping Method', exact: true });

export const cardNumberInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Card Number', exact: true });

export const nameOnCardInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Name on Card', exact: true });

export const expirationDateInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Expiration Date', exact: true });

export const securityCodeInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Security Code', exact: true });

export const reviewOrderButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Review Order', exact: true });

export const placeOrderButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Place Order', exact: true }).first();

export const confirmationHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: 'Thank you for your order!', exact: true, level: 1 });
