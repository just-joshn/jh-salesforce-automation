import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import type { LoginCredentials } from './login.data';
import * as Locators from './login.locators';

export const openLogin = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/login'));
};

export const signIn = async (page: Page, credentials: LoginCredentials): Promise<void> => {
  await Locators.email(page).fill(credentials.email);
  await Locators.password(page).fill(credentials.password);
  await Locators.submit(page).click();
};

// A successful sign-in navigates away from the login page, so the form goes hidden.
export const waitForSignedIn = async (page: Page): Promise<void> => {
  await Locators.container(page).waitFor({ state: 'hidden' });
};
