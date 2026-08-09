import type { Page } from '@playwright/test';

import { buildPath } from '../../support/site';
import type { JourneyProduct, SocialProvider } from './social-login.data';
import * as Locators from './social-login.locators';

export const visitStorefront = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/'));
};

export const buildGuestBasket = async (page: Page, product: JourneyProduct): Promise<void> => {
  await page.goto(buildPath(product.path));
  await Locators.addToCartButton(page).click();
  await Locators.viewCartLink(page).click();
};

export const openSocialLogin = async (page: Page): Promise<void> => {
  await Locators.accountButton(page).click();
};

export const chooseSocialProvider = async (
  page: Page,
  provider: SocialProvider,
): Promise<void> => {
  await Locators.socialProviderButton(page, provider.label).click();
};

export const returnToBasket = async (page: Page): Promise<void> => {
  await Locators.cartButton(page).click();
};
