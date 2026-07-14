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

// The first size can map to an out-of-stock variant, which leaves Add to Cart disabled. Step
// through the sizes and stop on the first one the page doesn't flag as out of stock.
export const selectAvailableSize = async (page: Page): Promise<void> => {
  const sizes = Locators.variationOption(page, 'size');
  const count = await sizes.count();
  for (let index = 0; index < count; index++) {
    await sizes.nth(index).click();
    try {
      await Locators.outOfStock(page).first().waitFor({ state: 'hidden', timeout: 5000 });
      return;
    } catch {
      // this size is out of stock; try the next one
    }
  }
  throw new Error('every size for this product is out of stock');
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
