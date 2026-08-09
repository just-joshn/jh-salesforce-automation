import type { Page } from '@playwright/test';

import { buildPath } from '../../support/site';
import type { CancellationCredentials } from './order-cancellation.data';
import * as Locators from './order-cancellation.locators';

export const visitStorefront = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/'));
};

export const signIn = async (page: Page, credentials: CancellationCredentials): Promise<void> => {
  await Locators.accountButton(page).click();
  await Locators.emailInput(page).fill(credentials.email);
  await Locators.passwordOption(page).click();
  await Locators.passwordInput(page).fill(credentials.password);
  await Promise.all([page.waitForURL(buildPath('/account')), Locators.signInButton(page).click()]);
};

export const openOrderDetail = async (page: Page, orderNo: string): Promise<void> => {
  await page.goto(buildPath(`/account/orders/${encodeURIComponent(orderNo)}`));
};

export const startCancellation = async (page: Page): Promise<void> => {
  await Locators.cancelOrderButton(page).click();
};

export const selectCancellationReason = async (page: Page, reason: string): Promise<void> => {
  await Locators.cancellationReasonSelect(page).selectOption(reason);
};

export const confirmCancellation = async (page: Page): Promise<void> => {
  await Locators.confirmCancellationButton(page).click();
};
