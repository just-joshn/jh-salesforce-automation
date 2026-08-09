import type { Page } from '@playwright/test';

import { buildPath } from '../../support/site';
import * as Locators from './order-returns.locators';

export const openOmsOrder = async (page: Page, orderNo: string): Promise<void> => {
  await page.goto(buildPath(`/account/orders/${encodeURIComponent(orderNo)}`));
};

export const startReturn = async (page: Page): Promise<void> => {
  await Locators.startReturnButton(page).click();
};

export const selectReturnItem = async (page: Page, itemName: string): Promise<void> => {
  await Locators.returnItemCheckbox(page, itemName).check();
};

export const setReturnQuantity = async (
  page: Page,
  itemName: string,
  quantity: string,
): Promise<void> => {
  await Locators.returnQuantityInput(page, itemName).fill(quantity);
};

export const selectReturnReason = async (page: Page, reason: string): Promise<void> => {
  await Locators.returnReasonSelect(page).selectOption(reason);
};

export const reviewReturn = async (page: Page): Promise<void> => {
  await Locators.reviewReturnButton(page).click();
};

export const submitReturn = async (page: Page): Promise<void> => {
  await Locators.submitReturnButton(page).click();
};

export const refreshOmsOrder = async (page: Page): Promise<void> => {
  await page.reload();
};

export const visitStorefront = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/'));
};
