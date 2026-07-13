import { expect, test } from '../../support/fixtures';
import * as Actions from './checkout-pickup.actions';
import { checkout, pickupProduct } from './checkout-pickup.data';
import * as Locators from './checkout-pickup.locators';

// Guest completes a store-pickup purchase through to the order confirmation.
// Pickup, store, and stock detail is left to the checkout-pickup API test; this proves a finished order from a pickup cart.
test('complete a guest pickup purchase and see order confirmation', async ({ page }) => {
  test.setTimeout(150000);

  await Actions.openProduct(page, pickupProduct.masterId);
  await Actions.selectVariation(page, 'Color');
  await Actions.selectVariation(page, 'size');
  await Actions.openStoreSelection(page);
  await Actions.searchStore(page, pickupProduct.storeCountry, pickupProduct.storePostalCode);
  await Actions.selectFirstStore(page);
  await Actions.closeStoreModal(page);
  await Actions.addToCart(page);

  await Actions.openCheckout(page);
  await Actions.fillContact(page, checkout.email);
  // A pickup cart already carries the store address and method, so checkout skips shipping and lands on Payment.
  await Actions.fillShippingAddressIfPresent(page, checkout.address);
  await Actions.fillPayment(page, checkout.card);
  await Actions.placeOrder(page);

  await expect(Locators.confirmationContainer(page)).toBeVisible({ timeout: 20000 });
  await expect(Locators.orderNumber(page)).toBeVisible();
  await expect(page).toHaveURL(/\/checkout\/confirmation\/\d+/);
});
