import type { Locator, Page } from '@playwright/test';

export const accountButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'My Account', exact: true });

export const emailInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Email', exact: true });

export const passwordOption = (page: Page): Locator =>
  page.getByRole('button', { name: 'Password', exact: true });

export const forgotPasswordButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Forgot password?', exact: true });

export const resetPasswordButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Reset Password', exact: true });

export const returnToSignInButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Sign in', exact: true });
