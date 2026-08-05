import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import type { Credentials } from './orders.data';
import * as Locators from './orders.locators';

export const openOrderHistory = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/account/orders'));
};

export const signIn = async (page: Page, credentials: Credentials): Promise<void> => {
  await page.goto(buildPath('/login'));
  await Locators.signinEmail(page).fill(credentials.email);
  await Locators.usePasswordMethod(page).click();
  await Locators.signinPassword(page).fill(credentials.password);
  await Locators.signInButton(page).click();
  await page.waitForURL(/\/account/, { timeout: 20000 });
};

export const openOrderDetail = async (page: Page): Promise<void> => {
  await Locators.viewDetails(page).first().click();
};
