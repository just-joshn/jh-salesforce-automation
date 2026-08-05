import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import type { Credentials } from './signin.data';
import * as Locators from './signin.locators';

// Color change rebuilds sizes — wait longer for the click.
const selectVariation = async (page: Page, attribute: string): Promise<void> => {
  await Locators.variationOption(page, attribute).first().click({ timeout: 30000 });
};

// Click the in-stock size we already looked up.
const selectSize = async (page: Page, size: string): Promise<void> => {
  await Locators.sizeOption(page, size).click({ timeout: 30000 });
};

export const addProductToCart = async (
  page: Page,
  masterId: string,
  size: string,
): Promise<void> => {
  await page.goto(buildPath(`/product/${masterId}`));
  await selectVariation(page, 'Color');
  await selectSize(page, size);
  await Locators.addToCartButton(page).first().click();
  await Locators.addConfirmation(page).first().waitFor({ timeout: 15000 });
};

export const signIn = async (page: Page, credentials: Credentials): Promise<void> => {
  await page.goto(buildPath('/login'));
  await Locators.signinEmail(page).fill(credentials.email);
  await Locators.usePasswordMethod(page).click();
  await Locators.signinPassword(page).fill(credentials.password);
  await Locators.signInButton(page).click();
  await page.waitForURL(/\/account/, { timeout: 20000 });
};

export const openCart = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/cart'));
};
