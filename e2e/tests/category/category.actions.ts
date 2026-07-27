import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import * as Data from './category.data';
import * as Locators from './category.locators';

export const gotoCategory = async (page: Page, categoryId: string): Promise<void> => {
  await page.goto(buildPath(`/category/${categoryId}`));
};

// Pick the first real sort option (not default).
export const sortByFirstOption = async (page: Page): Promise<void> => {
  await Locators.sortSelect(page).selectOption({ index: 1 });
};

// Return product id from the link we click.
export const openFirstProduct = async (page: Page): Promise<string> => {
  const link = Locators.firstProductLink(page);
  const productId = Data.extractProductId(await link.getAttribute('href'));
  await link.click();
  return productId;
};
