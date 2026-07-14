import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import * as Locators from './cart-delivery.locators';

export const openProduct = async (page: Page, productId: string): Promise<void> => {
  await page.goto(buildPath(`/product/${productId}`));
};

// Choosing a color rebuilds the size buttons for a beat, so the click uses a generous timeout to wait it out.
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

export const addToCart = async (page: Page): Promise<void> => {
  await Locators.addToCart(page).first().click();
};

export const openCart = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/cart'));
};
