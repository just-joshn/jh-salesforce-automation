import { expect, test } from '../../support/fixtures';
import * as Actions from './cart-pickup.actions';
import { pickupProduct } from './cart-pickup.data';
import * as Locators from './cart-pickup.locators';

// Pick a store on the product page, add the product, and confirm the cart holds it for pickup.
test('select a pickup store and add the product to the cart for pickup', async ({ page }) => {
  test.setTimeout(90000);

  await Actions.openProduct(page, pickupProduct.masterId);

  await Actions.selectVariation(page, 'Color');
  await Actions.selectVariation(page, 'size');

  await Actions.openStoreSelection(page);
  await expect(Locators.storeModal(page)).toBeVisible();
  await Actions.searchStore(page, pickupProduct.storeCountry, pickupProduct.storePostalCode);

  await expect(Locators.storeResult(page, pickupProduct.storeName).first()).toBeVisible({
    timeout: 30000,
  });

  await Actions.selectFirstStore(page);
  await Actions.closeStoreModal(page);

  await expect(Locators.selectedStore(page, pickupProduct.storeName).first()).toBeVisible();

  await Actions.addToCart(page);
  const confirmation = Locators.addConfirmation(page).first();
  await expect(confirmation).toBeVisible({ timeout: 15000 });
  await expect(confirmation).toContainText(pickupProduct.name);

  // Cart persistence is the browser's concern here; the pickup, store, and stock links are covered
  // by the cart-pickup API test.
  await Actions.openCart(page);
  await expect(Locators.cartContainer(page)).toBeVisible();
  await expect(Locators.cartItem(page, pickupProduct.variantId)).toBeVisible({ timeout: 15000 });
});
