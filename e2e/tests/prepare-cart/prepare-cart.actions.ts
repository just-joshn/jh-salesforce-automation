import type { Page } from '@playwright/test';
import type { UiOrderableVariant } from '../../../api/support/products';
import { buildPath } from '../../support/site';
import * as Locators from './prepare-cart.locators';

export const openProduct = async (page: Page, masterId: string): Promise<void> => {
  await page.goto(buildPath(`/product/${masterId}`));
};

export const openCart = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/cart'));
};

// Build the basket the shopper arrives at the cart with. Color change rebuilds
// sizes, so those clicks get longer than the default timeout.
export const addProductToCart = async (page: Page, variant: UiOrderableVariant): Promise<void> => {
  await openProduct(page, variant.masterId);
  await Locators.productDetail(page).waitFor({ timeout: 30000 });
  await Locators.colorOption(page, variant.colorName).click({ timeout: 30000 });
  await Locators.sizeOption(page, variant.sizeName).click({ timeout: 30000 });
  await Locators.addToCart(page).click();
  await Locators.addConfirmation(page).waitFor({ timeout: 30000 });
};

export const increaseQuantity = async (
  page: Page,
  variantId: string,
  name: string,
): Promise<void> => {
  await Locators.itemQuantityIncrement(page, variantId, name).click();
};

export const removeItem = async (page: Page, variantId: string): Promise<void> => {
  await Locators.removeItem(page, variantId).click();
};

export const confirmRemoval = async (page: Page): Promise<void> => {
  await Locators.confirmRemove(page).click();
};

export const openPromoCode = async (page: Page): Promise<void> => {
  await Locators.promoCodeToggle(page).click();
};

export const proceedToCheckout = async (page: Page): Promise<void> => {
  await Locators.proceedToCheckout(page).click();
};
