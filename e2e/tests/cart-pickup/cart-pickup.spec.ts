import { expect, test } from '../../support/fixtures';
import * as Actions from './cart-pickup.actions';
import { orderableVariant, pickupProduct } from './cart-pickup.data';
import * as Locators from './cart-pickup.locators';

// Pick store, add item, cart shows pickup item.
test('select a pickup store and add the product to the cart for pickup', async ({
  page,
  request,
}) => {
  test.setTimeout(90000);

  const variant = await orderableVariant(request);

  await Actions.openProduct(page, variant.masterId);

  await Actions.selectVariation(page, 'Color');
  await Actions.selectSize(page, variant.sizeName);

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
  await expect(confirmation).toContainText(variant.productName);

  // Browser checks cart shows the item. Store/stock details are in the API test.
  await Actions.openCart(page);
  await expect(Locators.cartContainer(page)).toBeVisible();
  await expect(Locators.cartItem(page, variant.variantId)).toBeVisible({ timeout: 15000 });
});
