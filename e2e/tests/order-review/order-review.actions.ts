import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import type { ShopperCredentials } from './order-review.data';
import * as Locators from './order-review.locators';

export const signIn = async (page: Page, credentials: ShopperCredentials): Promise<void> => {
  await page.goto(buildPath('/login'));
  await Locators.signinEmail(page).fill(credentials.email);
  await Locators.usePasswordMethod(page).click();
  await Locators.signinPassword(page).fill(credentials.password);
  await Locators.signInButton(page).click();
  await page.waitForURL(/\/account/, { timeout: 60000 });
};

export const openOrderHistory = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/account/orders'));
  await Locators.orderHistoryPage(page).waitFor({ timeout: 60000 });
};

// The shopper opens one order from its own history entry, the way the page
// offers it, never by knowing the order's address.
export const openOrder = async (page: Page, orderNumberText: string): Promise<void> => {
  await Locators.viewDetails(Locators.orderCard(page, orderNumberText)).click();
  await Locators.orderDetailPage(page).waitFor({ timeout: 60000 });
};

export const returnToOrderHistory = async (page: Page): Promise<void> => {
  await Locators.backToOrderHistory(page).click();
  await Locators.orderHistoryPage(page).waitFor({ timeout: 60000 });
};
