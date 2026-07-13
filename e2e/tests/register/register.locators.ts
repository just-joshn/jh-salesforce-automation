import type { Locator, Page } from '@playwright/test';

// The Create Account form. Scoped to this form so its Email/Password don't match the search or
// newsletter inputs elsewhere on the page.
const registerForm = (page: Page): Locator => page.getByTestId('sf-auth-modal-form-register');
export const firstName = (page: Page): Locator => registerForm(page).getByLabel('First Name');
export const lastName = (page: Page): Locator => registerForm(page).getByLabel('Last Name');
export const email = (page: Page): Locator =>
  registerForm(page).getByLabel('Email', { exact: true });
export const password = (page: Page): Locator =>
  registerForm(page).getByLabel('Password', { exact: true });
export const createAccount = (page: Page): Locator =>
  page.getByRole('button', { name: /create account/i });

// Log Out only appears once signed in, so it doubles as proof of a successful registration.
export const logout = (page: Page): Locator => page.getByText(/log out/i);
