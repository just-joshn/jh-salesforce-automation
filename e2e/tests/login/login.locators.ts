import type { Locator, Page } from '@playwright/test';

export const container = (page: Page): Locator => page.getByTestId('login-page');

// Login form only (not newsletter). Step 1: email. Step 2: password.
const authForm = (page: Page): Locator => page.getByTestId('sf-auth-modal-form');
export const email = (page: Page): Locator => authForm(page).getByLabel('Email');
export const usePasswordMethod = (page: Page): Locator =>
  authForm(page).getByRole('button', { name: 'Password', exact: true });
export const password = (page: Page): Locator =>
  authForm(page).getByLabel('Password', { exact: true });
export const submit = (page: Page): Locator =>
  authForm(page).getByRole('button', { name: 'Sign In', exact: true });
