import type { Page } from '@playwright/test';
import { buildPath } from '../../../support/site';
import * as Locators from './configure-and-add.locators';

export const openProduct = async (page: Page, masterId: string): Promise<void> => {
  await page.goto(buildPath(`/product/${masterId}`));
};

// Color change rebuilds sizes — wait longer for the click.
export const selectColor = async (page: Page, color: string): Promise<void> => {
  await Locators.colorOption(page, color).click({ timeout: 30000 });
};

export const selectSize = async (page: Page, size: string): Promise<void> => {
  await Locators.sizeOption(page, size).click({ timeout: 30000 });
};

// The stepper starts at one, so raise it the rest of the way.
export const raiseQuantityTo = async (page: Page, quantity: number): Promise<void> => {
  for (let step = 1; step < quantity; step += 1) {
    await Locators.quantityIncrement(page).click();
  }
};

export const addToCart = async (page: Page): Promise<void> => {
  await Locators.addToCart(page).click();
};

export const openCart = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/cart'));
};
