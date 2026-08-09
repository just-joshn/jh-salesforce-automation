import type { Locator, Page } from '@playwright/test';

export const productHeading = (page: Page, productName: string): Locator =>
  page.getByRole('heading', { name: productName, exact: true, level: 2 });

export const addToCartButton = (page: Page): Locator =>
  page.getByRole('button', { name: /^Add(?: Bundle)? to Cart$/ });

export const addedToCartHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: /^\d+ items? added to cart$/, level: 1 });

export const viewCartLink = (page: Page): Locator =>
  page.getByRole('link', { name: 'View Cart', exact: true });

export const cartProduct = (page: Page, productName: string): Locator =>
  page.getByRole('link', { name: productName, exact: true });

export const proceedToCheckoutLink = (page: Page): Locator =>
  page.getByRole('link', { name: /^Proceed to Checkout(?: Secure)?$/ });

export const checkoutHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: 'Checkout', exact: true, level: 1 });

export const emailInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Email', exact: true });

export const checkoutAsGuestButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Checkout as Guest', exact: true });

export const firstNameInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'First Name', exact: true });

export const lastNameInput = (page: Page): Locator =>
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

export const shippingMethod = (page: Page): Locator => page.getByText('Ground', { exact: true });

export const editShippingAddressButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Edit Shipping Address', exact: true });

export const missingAddressError = (page: Page): Locator =>
  page.getByText('Please enter your address.', { exact: true });

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

export const invalidCardNumberError = (page: Page): Locator =>
  page.getByText('Please enter a valid card number.', { exact: true });

export const placeOrderButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Place Order', exact: true }).first();

export const confirmationHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: 'Thank you for your order!', exact: true, level: 1 });

export const orderNumber = (page: Page): Locator =>
  page.getByText(/^Order Number: \d{8}$/, { exact: true });
