import { findUiOrderableVariant } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import * as Actions from './checkout-pickup.actions';
import { checkout, pickupProduct } from './checkout-pickup.data';
import * as Locators from './checkout-pickup.locators';

// Guest completes a store-pickup purchase through to the order confirmation.
// Pickup, store, and stock detail is left to the checkout-pickup API test; this proves a finished order from a pickup cart.
test('complete a guest pickup purchase and see order confirmation', async ({ page, request }) => {
  test.setTimeout(150000);

  // Resolve a variant that is in stock right now; hardcoded variants go stale as stock drains.
  const { accessToken } = await getGuestToken(request);
  const variant = await findUiOrderableVariant(request, accessToken, pickupProduct.masterId);

  await Actions.openProduct(page, variant.masterId);
  await Actions.selectVariation(page, 'Color');
  await Actions.selectSize(page, variant.sizeName);
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
