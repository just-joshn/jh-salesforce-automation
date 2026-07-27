import { findUiOrderableVariant } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import * as Actions from './checkout-pickup.actions';
import { checkout, pickupProduct } from './checkout-pickup.data';
import * as Locators from './checkout-pickup.locators';

// Guest pickup buy through order confirmation.
// API test covers store/stock; this proves a real order.
test('complete a guest pickup purchase and see order confirmation', async ({ page, request }) => {
  test.setTimeout(150000);

  // Pick a size that is in stock right now.
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
  // Wait for "added to cart" before leaving — or the cart may stay empty.
  await expect(Locators.addConfirmation(page).first()).toBeVisible({ timeout: 15000 });

  await Actions.openCheckout(page);
  await Actions.fillContact(page, checkout.email);
  // Pickup skips shipping; goes to payment.
  await Actions.fillShippingAddressIfPresent(page, checkout.address);
  await Actions.fillPayment(page, checkout.card);
  await Actions.placeOrder(page);

  await expect(Locators.confirmationContainer(page)).toBeVisible({ timeout: 20000 });
  await expect(Locators.orderNumber(page)).toBeVisible();
  await expect(page).toHaveURL(/\/checkout\/confirmation\/\d+/);
});
