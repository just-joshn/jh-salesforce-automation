import type { Locator, Page } from '@playwright/test';

// Register form only (not search/newsletter fields).
const registerForm = (page: Page): Locator => page.getByTestId('sf-auth-modal-form-register');
export const firstName = (page: Page): Locator => registerForm(page).getByLabel('First Name');
export const lastName = (page: Page): Locator => registerForm(page).getByLabel('Last Name');
export const registerEmail = (page: Page): Locator =>
  registerForm(page).getByLabel('Email', { exact: true });
export const registerPassword = (page: Page): Locator =>
  registerForm(page).getByLabel('Password', { exact: true });
export const createAccount = (page: Page): Locator =>
  page.getByRole('button', { name: /create account/i });

// Login form only. Step 1: email. Step 2: password.
const authForm = (page: Page): Locator => page.getByTestId('sf-auth-modal-form');
export const signinEmail = (page: Page): Locator => authForm(page).getByLabel('Email');
export const usePasswordMethod = (page: Page): Locator =>
  authForm(page).getByRole('button', { name: 'Password', exact: true });
export const signinPassword = (page: Page): Locator =>
  authForm(page).getByLabel('Password', { exact: true });
export const signInButton = (page: Page): Locator =>
  authForm(page).getByRole('button', { name: 'Sign In', exact: true });

// Guest cart setup: pick a color and the in-stock size, then add.
export const variationOption = (page: Page, attribute: string): Locator =>
  page.getByRole('radiogroup', { name: attribute }).getByRole('radio');
// exact so "L" does not match "XL"
export const sizeOption = (page: Page, size: string): Locator =>
  page.getByRole('radiogroup', { name: 'size' }).getByRole('radio', { name: size, exact: true });
export const addToCartButton = (page: Page): Locator =>
  page.getByRole('button', { name: /^add to cart$/i });
export const addConfirmation = (page: Page): Locator =>
  page.getByRole('dialog').filter({ hasText: /added to cart/i });
export const cartItem = (page: Page, variantId: string): Locator =>
  page.getByTestId(`sf-cart-item-${variantId}`);

// Log Out means a registered session is active.
export const logout = (page: Page): Locator => page.getByText(/log out/i);

// Account landing: the profile card proves the account area is reachable.
export const profileCard = (page: Page): Locator => page.getByTestId('sf-toggle-card-my-profile');

// Password card on the account landing page. Edit opens the inline form.
export const passwordCard = (page: Page): Locator => page.getByTestId('sf-toggle-card-password');
export const editPassword = (page: Page): Locator =>
  passwordCard(page).getByRole('button', { name: 'Edit', exact: true });
export const currentPassword = (page: Page): Locator =>
  passwordCard(page).getByLabel('Current Password', { exact: true });
export const newPassword = (page: Page): Locator =>
  passwordCard(page).getByLabel('New Password', { exact: true });
export const confirmNewPassword = (page: Page): Locator =>
  passwordCard(page).getByLabel('Confirm New Password', { exact: true });
export const savePassword = (page: Page): Locator =>
  passwordCard(page).getByRole('button', { name: 'Save', exact: true });

// Success toast after the credential update goes through.
export const passwordUpdatedToast = (page: Page): Locator =>
  page.getByText('Password updated', { exact: true }).first();
