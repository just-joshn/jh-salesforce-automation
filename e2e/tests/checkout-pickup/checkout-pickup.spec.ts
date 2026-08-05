import { expect, test } from '../../support/fixtures';
import * as Actions from './checkout-pickup.actions';
import { confirmationUrlPattern, orderableVariant, pickupCheckout } from './checkout-pickup.data';
import * as Locators from './checkout-pickup.locators';

// Guest pickup buy through order confirmation.
// API test covers store/stock; this proves a real order.
test('complete a guest pickup purchase and see order confirmation', async ({ page, request }) => {
  test.setTimeout(150000);

  const variant = await orderableVariant(request);

  await Actions.openProduct(page, variant.masterId);
  await Actions.selectVariation(page, 'Color');
  await Actions.selectSize(page, variant.sizeName);
  await Actions.openStoreSelection(page);
  await Actions.searchStore(page, pickupCheckout.storeCountry, pickupCheckout.storePostalCode);
  await Actions.selectFirstStore(page);
  await Actions.closeStoreModal(page);
  await Actions.addToCart(page);
  // Wait for "added to cart" before leaving — or the cart may stay empty.
  await expect(Locators.addConfirmation(page).first()).toBeVisible({ timeout: 15000 });

  await Actions.openCheckout(page);
  await Actions.fillContact(page, pickupCheckout.email);
  // Pickup skips shipping; goes to payment.
  await Actions.fillShippingAddressIfPresent(page, pickupCheckout.address);
  await Actions.fillPayment(page, pickupCheckout.card);
  await Actions.placeOrder(page);

  await expect(Locators.confirmationContainer(page)).toBeVisible({ timeout: 20000 });
  await expect(Locators.orderNumber(page)).toBeVisible();
  await expect(page).toHaveURL(confirmationUrlPattern);
});
