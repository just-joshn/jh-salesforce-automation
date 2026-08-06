import type { Page } from '@playwright/test';
import type { UiOrderableVariant } from '../../../api/support/products';
import { buildPath } from '../../support/site';
import * as Locators from './bonus-product.locators';

export const openProduct = async (page: Page, masterId: string): Promise<void> => {
  await page.goto(buildPath(`/product/${masterId}`));
};

export const openCart = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/cart'));
  await Locators.cart(page).waitFor({ state: 'visible', timeout: 40000 });
};

// Put the qualifying product in the basket. That is what earns the promotion.
// A color change rebuilds the sizes, so those clicks get a longer timeout.
export const addQualifierToCart = async (
  page: Page,
  qualifier: UiOrderableVariant,
): Promise<void> => {
  await openProduct(page, qualifier.masterId);
  await Locators.productDetail(page).waitFor({ state: 'visible', timeout: 40000 });
  await Locators.colorOption(page, qualifier.colorName).click({ timeout: 30000 });
  await Locators.sizeOption(page, qualifier.sizeName).click({ timeout: 30000 });
  await Locators.addToCart(page).click();
  await Locators.addConfirmation(page).waitFor({ state: 'visible', timeout: 40000 });
};

export const openBonusChooser = async (page: Page): Promise<void> => {
  await Locators.selectBonusProducts(page).click({ timeout: 30000 });
};

// Picking a candidate swaps the chooser's list for that product's own view.
// Its options are resolved there.
export const chooseFirstCandidate = async (page: Page): Promise<void> => {
  await Locators.candidateSelect(page).click({ timeout: 30000 });
  await Locators.candidateView(page).waitFor({ state: 'visible', timeout: 30000 });
};

export const selectFirstCandidateSize = async (page: Page): Promise<void> => {
  await Locators.candidateSizes(page).first().click({ timeout: 30000 });
};

export const raiseCandidateQuantity = async (page: Page): Promise<void> => {
  await Locators.candidateQuantityIncrement(page).click({ timeout: 30000 });
};

export const lowerCandidateQuantity = async (page: Page): Promise<void> => {
  await Locators.candidateQuantityDecrement(page).click({ timeout: 30000 });
};

export const addChosenBonusProduct = async (page: Page): Promise<void> => {
  await Locators.candidateAddToCart(page).click({ timeout: 30000 });
};
