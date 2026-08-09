import type { Locator, Page } from '@playwright/test';

export const accountButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'My Account', exact: true });

export const socialProviderButton = (page: Page, providerName: string): Locator =>
  page.getByRole('button', { name: providerName, exact: true });

export const addToCartButton = (page: Page): Locator =>
  page.getByRole('button', { name: /^Add(?: Bundle)? to Cart$/ });

export const viewCartLink = (page: Page): Locator =>
  page.getByRole('link', { name: 'View Cart', exact: true });

export const cartProduct = (page: Page, productName: string): Locator =>
  page.getByRole('link', { name: productName, exact: true });

export const cartButton = (page: Page): Locator =>
  page.getByRole('button', { name: /^My cart, number of items: \d+$/ });

export const authenticatedAccountMenu = (page: Page): Locator =>
  page.getByRole('button', { name: 'Open account menu', exact: true });
