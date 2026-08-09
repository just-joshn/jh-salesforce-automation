import type { Locator, Page } from '@playwright/test';

export const productHeading = (page: Page, productName: string): Locator =>
  page.getByRole('heading', { name: productName, exact: true, level: 2 });

// Exact name deliberately excludes BUNDLE/SET masters, which expose "Add Bundle to Cart".
export const addToCartButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Add to Cart', exact: true });

export const addedToCartHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: /^\d+ items? added to cart$/, level: 1 });

export const viewCartLink = (page: Page): Locator =>
  page.getByRole('link', { name: 'View Cart', exact: true });

export const proceedToCheckoutLink = (page: Page): Locator =>
  page.getByRole('link', { name: /^Proceed to Checkout(?: Secure)?$/ });

export const checkoutHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: 'Checkout', exact: true, level: 1 });

export const emailInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Email', exact: true });

export const expressPaymentButton = (page: Page): Locator =>
  page.getByRole('button', { name: /express|apple pay|google pay|paypal/i });

export const providerAuthorizationButton = (page: Page): Locator =>
  page.getByRole('button', { name: /authorize|continue/i });

export const continueToShippingButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Continue to Shipping Method', exact: true });

export const placeOrderButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Place Order', exact: true }).first();

export const confirmationHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: 'Thank you for your order!', exact: true, level: 1 });
