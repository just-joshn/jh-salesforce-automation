import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import type { RegistrationInput } from './register.data';
import * as Locators from './register.locators';

export const openRegistration = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/registration'));
};

export const register = async (page: Page, input: RegistrationInput): Promise<void> => {
  await Locators.firstName(page).fill(input.firstName);
  await Locators.lastName(page).fill(input.lastName);
  await Locators.email(page).fill(input.email);
  await Locators.password(page).fill(input.password);
  await Locators.createAccount(page).first().click();
};
