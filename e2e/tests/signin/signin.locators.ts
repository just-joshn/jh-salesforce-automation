import type { Locator, Page } from '@playwright/test';

export const variationOption = (page: Page, attribute: string): Locator =>
  page.getByRole('radiogroup', { name: attribute }).getByRole('radio');
export const addToCartButton = (page: Page): Locator =>
  page.getByRole('button', { name: /^add to cart$/i });
export const addConfirmation = (page: Page): Locator =>
  page.getByRole('dialog').filter({ hasText: /added to cart/i });

// Shown in the buy box when the selected variant can't be ordered.
export const outOfStock = (page: Page): Locator => page.getByText(/out of stock/i);

// Sign-in form, scoped so it ignores the newsletter fields lower on the page. Login is two steps:
// enter email, click Password, then the password field and Sign In appear.
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
