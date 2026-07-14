import { findUiOrderableVariant } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import * as Actions from './checkout-pickup.actions';
import { checkout, pickupProduct } from './checkout-pickup.data';
import * as Locators from './checkout-pickup.locators';

// Guest completes a store-pickup purchase through to the order confirmation.
// Store and stock details are covered by the checkout-pickup API test; this proves a
// pickup cart can finish as a real order.
test('complete a guest pickup purchase and see order confirmation', async ({ page, request }) => {
  test.setTimeout(150000);

  // Look up a variant that is in stock right now; hardcoded ones go stale as stock sells out.
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
  // The confirmation dialog only shows once the add-to-cart call succeeds. Leaving the
  // product page before then can cancel that call and leave checkout with an empty cart.
  await expect(Locators.addConfirmation(page).first()).toBeVisible({ timeout: 15000 });

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
