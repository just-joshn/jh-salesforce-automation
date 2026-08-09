import type { Locator, Page } from '@playwright/test';

export const accountButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'My Account', exact: true });

export const registrationDialog = (page: Page): Locator => page.getByRole('dialog').first();

export const createAccountOption = (page: Page): Locator =>
  registrationDialog(page).getByRole('button', { name: 'Create account', exact: true });

export const firstNameInput = (page: Page): Locator =>
  registrationDialog(page).getByRole('textbox', { name: 'First Name', exact: true });

export const lastNameInput = (page: Page): Locator =>
  registrationDialog(page).getByRole('textbox', { name: 'Last Name', exact: true });

export const emailInput = (page: Page): Locator =>
  registrationDialog(page).getByRole('textbox', { name: 'Email', exact: true });

export const passwordInput = (page: Page): Locator =>
  registrationDialog(page).getByRole('textbox', { name: 'Password', exact: true });

export const createAccountButton = (page: Page): Locator =>
  registrationDialog(page).getByRole('button', { name: 'Create Account', exact: true });

export const firstNameError = (page: Page): Locator =>
  registrationDialog(page).getByText('Please enter your first name.', { exact: true });

export const lastNameError = (page: Page): Locator =>
  registrationDialog(page).getByText('Please enter your last name.', { exact: true });

export const passwordError = (page: Page): Locator =>
  registrationDialog(page).getByText('Password must contain at least 8 characters.', {
    exact: true,
  });

export const registrationError = (page: Page): Locator =>
  registrationDialog(page).getByRole('alert');

export const authenticatedAccountMenu = (page: Page): Locator =>
  page.getByRole('button', { name: 'Open account menu', exact: true });

export const accountHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: 'My Account', exact: true, level: 1 });
