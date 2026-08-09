import type { Page } from '@playwright/test';

import { buildPath } from '../../support/site';
import type { JourneyProduct, LoginCredentials } from './password-login.data';
import * as Locators from './password-login.locators';

export const visitStorefront = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/'));
};

export const buildGuestBasket = async (page: Page, product: JourneyProduct): Promise<void> => {
  await page.goto(buildPath(product.path));
  await Locators.addToCartButton(page).click();
  await Locators.viewCartLink(page).click();
};

const openPasswordLogin = async (page: Page, email: string): Promise<void> => {
  await Locators.accountButton(page).click();
  await Locators.emailInput(page).fill(email);
  await Locators.passwordOption(page).click();
};

export const submitCredentials = async (
  page: Page,
  credentials: LoginCredentials,
): Promise<void> => {
  await openPasswordLogin(page, credentials.email);
  await Locators.passwordInput(page).fill(credentials.password);
  await Locators.signInButton(page).click();
};

export const signIn = async (page: Page, credentials: LoginCredentials): Promise<void> => {
  await openPasswordLogin(page, credentials.email);
  await Locators.passwordInput(page).fill(credentials.password);
  await Promise.all([page.waitForURL(buildPath('/account')), Locators.signInButton(page).click()]);
};

export const returnToBasket = async (page: Page): Promise<void> => {
  await Locators.cartButton(page).click();
};
