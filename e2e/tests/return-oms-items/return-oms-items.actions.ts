import type { Locator, Page } from '@playwright/test';
import type { ShopperCredentials } from '../../support/oms';
import { buildPath } from '../../support/site';
import { returnModalTitle } from './return-oms-items.data';
import * as Locators from './return-oms-items.locators';

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

export const startReturn = async (page: Page, orderNo: string): Promise<void> => {
  await Locators.startReturn(page).click();
  await Locators.returnModalText(page, returnModalTitle(orderNo)).waitFor({ timeout: pageTimeout });
};

export const selectLine = async (row: Locator): Promise<void> => {
  await Locators.itemCheckbox(row).check();
  await Locators.itemQuantity(row).waitFor({ timeout: pageTimeout });
};

/**
 * Types a quantity and commits it by leaving the field, which is what applies the
 * stepper's own clamping to the latest returnable limit.
 */
export const enterQuantity = async (row: Locator, quantity: number): Promise<void> => {
  await Locators.itemQuantity(row).fill(String(quantity));
  await Locators.itemQuantity(row).blur();
};

export const chooseReason = async (row: Locator, reason: string): Promise<void> => {
  await Locators.itemReason(row).selectOption(reason);
};

export const reviewReturn = async (page: Page, reviewTitle: string): Promise<void> => {
  await Locators.reviewReturn(page).click();
  await Locators.returnModalText(page, reviewTitle).waitFor({ timeout: pageTimeout });
};

export const submitReturn = async (page: Page): Promise<void> => {
  await Locators.submitReturn(page).click();
};
