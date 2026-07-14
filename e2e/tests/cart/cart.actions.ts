import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import * as Locators from './cart.locators';

export const openProduct = async (page: Page, productId: string): Promise<void> => {
  await page.goto(buildPath(`/product/${productId}`));
};

// Selecting a color redraws the size buttons, so the click gets a long timeout to ride out that flicker.
export const selectVariation = async (page: Page, attribute: string): Promise<void> => {
  await Locators.variationOption(page, attribute).first().click({ timeout: 30000 });
};

// The spec discovers an in-stock size through the API first, so the click is deterministic
// instead of probing sizes until one isn't flagged out of stock.
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
