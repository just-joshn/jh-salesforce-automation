import type { Page } from '@playwright/test';
import type { StoreVariant } from '../../../api/support/products';
import type { NearbyStore } from '../../../api/support/stores';
import { buildPath } from '../../support/site';
import * as Locators from './pickup-availability.locators';

export const openCategory = async (page: Page, categoryId: string): Promise<void> => {
  await page.goto(buildPath(`/category/${categoryId}`));
};

// With no store chosen yet, clicking the availability filter opens the finder.
export const openStoreFinder = async (page: Page): Promise<void> => {
  await Locators.inventoryFilterCheckbox(page).click();
  await Locators.storeModal(page).waitFor({ timeout: 30000 });
};

export const findNearbyStores = async (
  page: Page,
  countryLabel: string,
  postalCode: string,
): Promise<void> => {
  await Locators.storeCountry(page).selectOption({ label: countryLabel });
  await Locators.storePostalCode(page).fill(postalCode);
  await Locators.storeFind(page).click();
};

export const selectStore = async (page: Page, store: NearbyStore): Promise<void> => {
  await Locators.storeResult(page, store.name).waitFor({ timeout: 30000 });
  await Locators.storeChoice(page, store.id).click();
};

// The filter learns the chosen store while the finder is still open, so the
// filter chip can be expected the moment the finder is gone.
export const closeStoreFinder = async (page: Page, storeName: string): Promise<void> => {
  await Locators.storeInventoryFilter(page).getByText(storeName).first().waitFor({
    timeout: 30000,
  });
  await Locators.storeModalClose(page).click();
  await Locators.storeModal(page).waitFor({ state: 'hidden', timeout: 20000 });
};

export const openProduct = async (page: Page, masterId: string): Promise<void> => {
  await Locators.productTile(page, masterId).click();
};

export const selectStoreVariant = async (page: Page, product: StoreVariant): Promise<void> => {
  await Locators.colorOption(page, product.colorName).click({ timeout: 30000 });
  if (product.sizeName !== undefined) {
    await Locators.sizeOption(page, product.sizeName).click({ timeout: 30000 });
  }
};

// The fulfillment choice is served rendered and stays pressable for a moment
// before hydration attaches its handler, so an early press is dropped with no
// sign of it. Pressing a radio is idempotent, so the press repeats until the
// input itself holds the choice.
export const choosePickup = async (page: Page): Promise<void> => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await Locators.pickupOption(page).click({ timeout: 30000 });
    if (await Locators.pickupRadio(page).isChecked()) return;
  }
  throw new Error('the product page never held the store-pickup choice after it was pressed');
};
