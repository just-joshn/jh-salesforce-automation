import type { Locator, Page } from '@playwright/test';

export const variationOption = (page: Page, attribute: string): Locator =>
  page.getByRole('radiogroup', { name: attribute }).getByRole('radio');
// exact so "L" does not match "XL"
export const sizeOption = (page: Page, size: string): Locator =>
  page.getByRole('radiogroup', { name: 'size' }).getByRole('radio', { name: size, exact: true });
export const addToCartButton = (page: Page): Locator =>
  page.getByRole('button', { name: /^add to cart$/i });
export const addConfirmation = (page: Page): Locator =>
  page.getByRole('dialog').filter({ hasText: /added to cart/i });

// Login form only (not newsletter). Step 1: email. Step 2: password.
const authForm = (page: Page): Locator => page.getByTestId('sf-auth-modal-form');
export const signinEmail = (page: Page): Locator => authForm(page).getByLabel('Email');
export const usePasswordMethod = (page: Page): Locator =>
  authForm(page).getByRole('button', { name: 'Password', exact: true });
export const signinPassword = (page: Page): Locator =>
  authForm(page).getByLabel('Password', { exact: true });
export const signInButton = (page: Page): Locator =>
  authForm(page).getByRole('button', { name: 'Sign In', exact: true });

export const logout = (page: Page): Locator => page.getByText(/log out/i);
export const cartItem = (page: Page, variantId: string): Locator =>
  page.getByTestId(`sf-cart-item-${variantId}`);
