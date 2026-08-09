import type { Locator, Page } from '@playwright/test';

export const accountButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'My Account', exact: true });

export const emailInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Email', exact: true });

export const passwordOption = (page: Page): Locator =>
  page.getByRole('button', { name: 'Password', exact: true });

export const passwordInput = (page: Page): Locator => page.getByLabel('Password', { exact: true });

export const signInButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Sign In', exact: true });

export const addToCartButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Add to Cart', exact: true });

export const viewCartLink = (page: Page): Locator =>
  page.getByRole('link', { name: 'View Cart', exact: true });

export const cartButton = (page: Page): Locator =>
  page.getByRole('button', { name: /^My cart, number of items: \d+$/ });

export const cartProduct = (page: Page, productName: string): Locator =>
  page.getByRole('link', { name: productName, exact: true });

export const authenticatedAccountMenu = (page: Page): Locator =>
  page.getByRole('button', { name: 'Open account menu', exact: true });

export const accountHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: 'My Account', exact: true, level: 1 });

export const authenticationError = (page: Page): Locator => page.getByRole('alert');
