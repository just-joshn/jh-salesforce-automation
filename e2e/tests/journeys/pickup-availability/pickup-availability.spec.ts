import { expect, test } from '../../../support/fixtures';
import * as Actions from './pickup-availability.actions';
import {
  category,
  pageSize,
  pickupAvailability,
  productUrl,
  removeFilterName,
  resultCount,
  selectedFilterLabel,
  storeArea,
} from './pickup-availability.data';
import * as Locators from './pickup-availability.locators';

// The shopper's question is "what can I pick up near me?" — pick the store, the
// list shrinks to what that store's stock actually holds, and a product from it
// turns out to be on the shelf for a sellable size.
test('filter a category to a nearby store and confirm the shelf there', async ({
  page,
  request,
}) => {
  test.setTimeout(150000);

  const { store, total, masterIds, product } = await pickupAvailability(request);

  await Actions.openCategory(page, category.id);
  await expect(Locators.productList(page)).toBeVisible();
  await expect(Locators.categoryHeading(page, category.name)).toBeVisible();

  await Actions.openStoreFinder(page);
  await Actions.findNearbyStores(page, storeArea.countryLabel, storeArea.postalCode);
  await Actions.selectStore(page, store);
  await expect(Locators.storeRadio(page, store.id)).toBeChecked({ timeout: 15000 });
  await Actions.closeStoreFinder(page, store.name);

  // Choosing the store applied its stock id as the list's inventory filter.
  await expect(Locators.inventoryFilterCheckbox(page)).toBeChecked();
  await expect(Locators.storeInventoryFilter(page)).toContainText(selectedFilterLabel(store.name));
  await expect(Locators.selectedFilter(page, removeFilterName(store.name))).toBeVisible();

  // The grid now shows exactly what Shopper Search says that stock holds.
  await expect(Locators.resultCountHeading(page)).toHaveText(resultCount(total));
  await expect(Locators.productTiles(page)).toHaveCount(Math.min(total, pageSize));
  await expect(Locators.productTile(page, product.masterId)).toBeVisible();

  await Actions.openProduct(page, product.masterId);
  await expect(page).toHaveURL(productUrl(product.masterId));
  await expect(Locators.productDetail(page)).toBeVisible();

  await Actions.selectStoreVariant(page, product);

  // For the shelf-checked size, the page offers pickup at that very store.
  await expect(Locators.storeStockMessage(page, store.name)).toBeVisible({ timeout: 15000 });
  await expect(Locators.pickupRadio(page)).toBeEnabled();

  await Actions.choosePickup(page);
  await expect(Locators.pickupRadio(page)).toBeChecked();
  await expect(Locators.addToCart(page)).toBeEnabled();

  // Guardrail: this test only makes sense while it drives the same shelf the
  // product list page filtered by.
  expect(masterIds).toContain(product.masterId);
});
