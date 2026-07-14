import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import * as Locators from './cart-pickup.locators';

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

export const openStoreSelection = async (page: Page): Promise<void> => {
  await Locators.selectStoreButton(page).first().click();
};

// The store finder needs a country selected before it will search on the postal code.
export const searchStore = async (
  page: Page,
  country: string,
  postalCode: string,
): Promise<void> => {
  await Locators.storeCountry(page).selectOption({ label: country });
  await Locators.storePostalCode(page).fill(postalCode);
  await Locators.storeFind(page).click();
};

export const selectFirstStore = async (page: Page): Promise<void> => {
  await Locators.storeChoice(page).first().click();
};

export const closeStoreModal = async (page: Page): Promise<void> => {
  const close = Locators.storeModalClose(page).first();
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  }
};

export const addToCart = async (page: Page): Promise<void> => {
  await Locators.addToCart(page).first().click();
};

export const openCart = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/cart'));
};
