import type { Page } from '@playwright/test';

export const container = (page: Page) => page.getByTestId('login-page');

// Login form only (not newsletter). Step 1: email. Step 2: password.
const authForm = (page: Page) => page.getByTestId('sf-auth-modal-form');
export const email = (page: Page) => authForm(page).getByLabel('Email');
export const usePasswordMethod = (page: Page) =>
  authForm(page).getByRole('button', { name: 'Password', exact: true });
export const password = (page: Page) => authForm(page).getByLabel('Password', { exact: true });
export const submit = (page: Page) =>
  authForm(page).getByRole('button', { name: 'Sign In', exact: true });
