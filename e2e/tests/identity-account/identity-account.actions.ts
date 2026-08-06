import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import type { RegistrationInput, ShopperCredentials } from './identity-account.data';
import * as Locators from './identity-account.locators';

export const openRegistration = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/registration'));
};

export const register = async (page: Page, input: RegistrationInput): Promise<void> => {
  await Locators.firstName(page).fill(input.firstName);
  await Locators.lastName(page).fill(input.lastName);
  await Locators.registerEmail(page).fill(input.email);
  await Locators.registerPassword(page).fill(input.password);
  await Locators.createAccount(page).first().click();
};

export const openLogin = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/login'));
};

export const signIn = async (page: Page, credentials: ShopperCredentials): Promise<void> => {
  await Locators.signinEmail(page).fill(credentials.email);
  await Locators.usePasswordMethod(page).click();
  await Locators.signinPassword(page).fill(credentials.password);
  await Locators.signInButton(page).click();
  await page.waitForURL(/\/account/, { timeout: 20000 });
};

// A color change rebuilds the sizes, so these clicks get a longer timeout.
export const addProductToCart = async (
  page: Page,
  masterId: string,
  size: string,
): Promise<void> => {
  await page.goto(buildPath(`/product/${masterId}`));
  await Locators.variationOption(page, 'Color').first().click({ timeout: 30000 });
  await Locators.sizeOption(page, size).click({ timeout: 30000 });
  await Locators.addToCartButton(page).first().click();
  await Locators.addConfirmation(page).first().waitFor({ timeout: 15000 });
};

export const openCart = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/cart'));
};

// Inline editor on the account landing page: current, new, confirm, save.
export const changePassword = async (
  page: Page,
  credentials: ShopperCredentials,
  nextPassword: string,
): Promise<void> => {
  await Locators.editPassword(page).click();
  await Locators.currentPassword(page).fill(credentials.password);
  await Locators.newPassword(page).fill(nextPassword);
  await Locators.confirmNewPassword(page).fill(nextPassword);
  await Locators.savePassword(page).click();
};
