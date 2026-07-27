import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import * as Locators from './cart-pickup.locators';

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

export const openStoreSelection = async (page: Page): Promise<void> => {
  await Locators.selectStoreButton(page).first().click();
};

// Pick country before searching by zip.
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

// Close store finder so it doesn't block Add to Cart.
export const closeStoreModal = async (page: Page): Promise<void> => {
  const modal = Locators.storeModal(page);
  if (!(await modal.isVisible().catch(() => false))) return;

  const close = Locators.storeModalClose(page);
  if (await close.isVisible().catch(() => false)) {
    await close.click().catch(() => undefined);
  }
  if (await modal.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
  }

  await modal.waitFor({ state: 'hidden', timeout: 10000 });
};

export const addToCart = async (page: Page): Promise<void> => {
  await Locators.addToCart(page).first().click();
};

export const openCart = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/cart'));
};
