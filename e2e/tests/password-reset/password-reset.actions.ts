import type { Page } from '@playwright/test';

import { buildPath } from '../../support/site';
import type { PasswordReset, PasswordResetRequest } from './password-reset.data';
import * as Locators from './password-reset.locators';

export const visitStorefront = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/'));
};

export const openPasswordResetRequest = async (
  page: Page,
  request: PasswordResetRequest,
): Promise<void> => {
  await Locators.accountButton(page).click();
  await Locators.emailInput(page).fill(request.email);
  await Locators.passwordOption(page).click();
  await Locators.forgotPasswordButton(page).click();
};

export const submitPasswordResetRequest = async (page: Page): Promise<void> => {
  await Locators.resetPasswordButton(page).click();
};

export const openResetLanding = async (page: Page, path: string): Promise<void> => {
  await page.goto(buildPath(path));
};

export const enterNewPassword = async (page: Page, reset: PasswordReset): Promise<void> => {
  await Locators.newPasswordInput(page).fill(reset.newPassword);
  await Locators.confirmNewPasswordInput(page).fill(reset.newPassword);
};

export const applyPasswordReset = async (page: Page): Promise<void> => {
  await Locators.resetPasswordButton(page).click();
};

export const returnToSignIn = async (page: Page): Promise<void> => {
  await Locators.returnToSignInButton(page).click();
};
