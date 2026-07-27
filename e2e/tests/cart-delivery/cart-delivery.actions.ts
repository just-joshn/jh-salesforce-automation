import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import * as Locators from './cart-delivery.locators';

export const openProduct = async (page: Page, productId: string): Promise<void> => {
  await page.goto(buildPath(`/product/${productId}`));
};

// Color change rebuilds sizes — wait longer for the click.
export const selectVariation = async (page: Page, attribute: string): Promise<void> => {
  await Locators.variationOption(page, attribute).first().click({ timeout: 30000 });
};

// Click the in-stock size we already looked up.
export const selectSize = async (page: Page, size: string): Promise<void> => {
  await Locators.sizeOption(page, size).click({ timeout: 30000 });
};

export const addToCart = async (page: Page): Promise<void> => {
  await Locators.addToCart(page).first().click();
};

export const openCart = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/cart'));
};
