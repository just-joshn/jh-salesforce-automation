import type { Locator, Page } from '@playwright/test';

export const accountButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'My Account', exact: true });

export const emailInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Email', exact: true });

export const requestCodeButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Continue', exact: true });

export const codeSentHeading = (page: Page): Locator =>
  page.getByRole('dialog').getByRole('banner');

export const codeSentInstructions = (page: Page): Locator =>
  page.getByText('To log in to your account, enter the code sent to your email.', { exact: true });

export const resendCodeButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Resend Code', exact: true });

export const closeCodeDialogButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Close', exact: true });

export const codeInputs = (page: Page): Locator => page.getByRole('dialog').getByRole('textbox');

export const codeInput = (page: Page, index: number): Locator => codeInputs(page).nth(index);

export const addToCartButton = (page: Page): Locator =>
  page.getByRole('button', { name: /^Add(?: Bundle)? to Cart$/ });

export const viewCartLink = (page: Page): Locator =>
  page.getByRole('link', { name: 'View Cart', exact: true });

export const cartButton = (page: Page): Locator =>
  page.getByRole('button', { name: /^My cart, number of items: \d+$/ });

export const cartProduct = (page: Page, productName: string): Locator =>
  page.getByRole('link', { name: productName, exact: true });

export const authenticatedAccountMenu = (page: Page): Locator =>
  page.getByRole('button', { name: 'Open account menu', exact: true });
