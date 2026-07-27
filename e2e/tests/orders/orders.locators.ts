import type { Locator, Page } from '@playwright/test';

// Login form only. Step 1: email. Step 2: password.
const authForm = (page: Page): Locator => page.getByTestId('sf-auth-modal-form');
export const signinEmail = (page: Page): Locator => authForm(page).getByLabel('Email');
export const usePasswordMethod = (page: Page): Locator =>
  authForm(page).getByRole('button', { name: 'Password', exact: true });
export const signinPassword = (page: Page): Locator =>
  authForm(page).getByLabel('Password', { exact: true });
export const signInButton = (page: Page): Locator =>
  authForm(page).getByRole('button', { name: 'Sign In', exact: true });

export const orderHistoryPage = (page: Page): Locator =>
  page.getByTestId('account-order-history-page');
export const viewDetails = (page: Page): Locator =>
  page.getByRole('link', { name: /view details/i });
export const orderNumber = (page: Page, orderNo: string): Locator => page.getByText(orderNo);
