import type { Page } from '@playwright/test';
import type { ShopperCredentials } from '../../support/oms';
import { buildPath } from '../../support/site';
import * as Locators from './ecom-order-fallback.locators';

const pageTimeout = 60000;

export const signIn = async (page: Page, credentials: ShopperCredentials): Promise<void> => {
  await page.goto(buildPath('/login'));
  await Locators.signinEmail(page).fill(credentials.email);
  await Locators.usePasswordMethod(page).click();
  await Locators.signinPassword(page).fill(credentials.password);
  await Locators.signInButton(page).click();
  await page.waitForURL(/\/account/, { timeout: pageTimeout });
};

export const openOrderHistory = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/account/orders'));
  await Locators.orderHistoryPage(page).waitFor({ timeout: pageTimeout });
};

export const openOrder = async (page: Page, orderNumberText: string): Promise<void> => {
  await Locators.viewDetails(Locators.orderCard(page, orderNumberText)).click();
  await Locators.orderDetailPage(page).waitFor({ timeout: pageTimeout });
};
