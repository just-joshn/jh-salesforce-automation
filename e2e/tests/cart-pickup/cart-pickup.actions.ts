import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import * as Locators from './cart-pickup.locators';

export const openProduct = async (page: Page, productId: string): Promise<void> => {
  await page.goto(buildPath(`/product/${productId}`));
};

// Color changes re-render the size buttons, so the click gets extra time rather than failing mid-flicker.
export const selectVariation = async (page: Page, attribute: string): Promise<void> => {
  await Locators.variationOption(page, attribute).first().click({ timeout: 30000 });
};

// The first size can map to an out-of-stock variant, which leaves Add to Cart disabled. Step
// through the sizes and stop on the first one the page doesn't flag as out of stock.
export const selectAvailableSize = async (page: Page): Promise<void> => {
  const sizes = Locators.variationOption(page, 'size');
  const count = await sizes.count();
  for (let index = 0; index < count; index++) {
    await sizes.nth(index).click();
    if (!(await Locators.outOfStock(page).first().isVisible())) return;
  }
  throw new Error('every size for this product is out of stock');
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
