import type { Page } from '@playwright/test';

export const container = (page: Page) => page.getByTestId('login-page');

// Sign-in form, scoped so it ignores the newsletter fields lower on the page. Login is two steps:
// enter email, click Password, then the password field and Sign In appear.
const authForm = (page: Page) => page.getByTestId('sf-auth-modal-form');
export const email = (page: Page) => authForm(page).getByLabel('Email');
export const usePasswordMethod = (page: Page) =>
  authForm(page).getByRole('button', { name: 'Password', exact: true });
export const password = (page: Page) => authForm(page).getByLabel('Password', { exact: true });
export const submit = (page: Page) =>
  authForm(page).getByRole('button', { name: 'Sign In', exact: true });
