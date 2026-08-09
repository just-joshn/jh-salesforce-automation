import type { Locator, Page } from '@playwright/test';

export const addToCartButton = (page: Page): Locator =>
  page.getByRole('button', { name: /^Add (?:Bundle )?to Cart$/ });

export const basketProduct = (page: Page, productName: string): Locator =>
  page.getByRole('link', { name: productName, exact: true });

export const emptyBasketMessage = (page: Page): Locator =>
  page.getByText('Your cart is empty.', { exact: true });

export const storefrontMain = (page: Page): Locator => page.getByRole('main');

export const viewCartLink = (page: Page): Locator =>
  page.getByRole('link', { name: 'View Cart', exact: true });
