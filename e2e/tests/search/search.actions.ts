import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import * as Data from './search.data';
import * as Locators from './search.locators';

export const openStorefront = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/'));
};

export const search = async (page: Page, term: string): Promise<void> => {
  const input = Locators.searchInput(page);
  await input.click();
  await input.fill(term);
  await input.press('Enter');
};

// Grabs the product id from the link before clicking so the spec can verify it opened the right one.
export const openFirstProduct = async (page: Page): Promise<string> => {
  const link = Locators.firstProductLink(page);
  const productId = Data.extractProductId(await link.getAttribute('href'));
  await link.click();
  return productId;
};
