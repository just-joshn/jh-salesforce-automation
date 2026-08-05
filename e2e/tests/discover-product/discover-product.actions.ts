import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import * as Locators from './discover-product.locators';

export const openStorefront = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/'));
};

export const search = async (page: Page, term: string): Promise<void> => {
  const input = Locators.searchInput(page);
  await input.click();
  await input.fill(term);
  await input.press('Enter');
};

export const openProduct = async (page: Page, masterId: string): Promise<void> => {
  await Locators.productTile(page, masterId).click();
};

// Color change rebuilds sizes — wait longer for the click.
export const selectColor = async (page: Page, color: string): Promise<void> => {
  await Locators.colorOption(page, color).click({ timeout: 30000 });
};

export const selectSize = async (page: Page, size: string): Promise<void> => {
  await Locators.sizeOption(page, size).click({ timeout: 30000 });
};
