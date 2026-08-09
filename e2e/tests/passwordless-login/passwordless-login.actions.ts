import type { Page } from '@playwright/test';

import { buildPath } from '../../support/site';
import type { GuestBasketProduct, PasswordlessLoginRequest } from './passwordless-login.data';
import * as Locators from './passwordless-login.locators';

export const visitStorefront = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/'));
};

export const buildGuestBasket = async (page: Page, product: GuestBasketProduct): Promise<void> => {
  await page.goto(buildPath(`/product/${product.productId}`));
  await Locators.addToCartButton(page).click();
  await Locators.cartButtonWithCount(page, 1).waitFor();
  await page.goto(buildPath('/cart'));
};

export const requestPasswordlessLogin = async (
  page: Page,
  request: PasswordlessLoginRequest,
): Promise<void> => {
  await Locators.accountButton(page).click();
  await Locators.emailInput(page).fill(request.email);
  await Locators.requestCodeButton(page).click();
};

export const closeCodeDialog = async (page: Page): Promise<void> => {
  await Locators.closeCodeDialogButton(page).click();
};

export const openCart = async (page: Page): Promise<void> => {
  await Locators.cartButton(page).click();
};

export const openPasswordlessLanding = async (page: Page, landingPath: string): Promise<void> => {
  await page.goto(buildPath(landingPath));
};

export const enterPasswordlessToken = async (page: Page, token: string): Promise<void> => {
  for (const [index, digit] of [...token].entries()) {
    await Locators.codeInput(page, index).fill(digit);
  }
};
