import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import * as Locators from './cart.locators';

export const openProduct = async (page: Page, productId: string): Promise<void> => {
  await page.goto(buildPath(`/product/${productId}`));
};

// Picking a color redraws the size buttons, so the click gets extra time to wait out the flicker.
export const selectVariation = async (page: Page, attribute: string): Promise<void> => {
  await Locators.variationOption(page, attribute).first().click({ timeout: 30000 });
};

// The spec already found an in-stock size through the API, so this clicks one known-good
// size instead of trying sizes until one isn't marked out of stock.
export const selectSize = async (page: Page, size: string): Promise<void> => {
  await Locators.sizeOption(page, size).click({ timeout: 30000 });
};

export const addToCart = async (page: Page): Promise<void> => {
  await Locators.addToCart(page).first().click();
};

export const openCart = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/cart'));
};

export const incrementQuantity = async (page: Page, variantId: string): Promise<void> => {
  await Locators.itemIncrement(page, variantId).first().click();
};

export const proceedToCheckout = async (page: Page): Promise<void> => {
  await Locators.proceedToCheckout(page).first().click();
};
