import { expect, test } from '../../support/fixtures';
import * as Actions from './checkout-delivery.actions';
import { checkout } from './checkout-delivery.data';
import * as Locators from './checkout-delivery.locators';

// Guest (not signed in) completes a delivery purchase through to the order confirmation.
test('complete a guest delivery purchase and see order confirmation', async ({ page }) => {
  // Guest checkout is a long flow on the shared demo store.
  test.setTimeout(120000);

  await Actions.openProduct(page, checkout.masterId);
  await Actions.selectVariation(page, 'Color');
  await Actions.selectVariation(page, 'size');
  await Actions.addToCart(page);

  await Actions.openCheckout(page);
  await Actions.fillContact(page, checkout.email);
  // The demo store sometimes prefills the address and jumps to Payment, so fill the form only when it appears.
  await Actions.fillShippingAddressIfPresent(page, checkout.address);
  await Actions.fillPayment(page, checkout.card);

  await Actions.placeOrder(page);

  // One confirmation page shows, with an order number.
  await expect(Locators.confirmationContainer(page)).toBeVisible({ timeout: 20000 });
  await expect(Locators.thankYouHeading(page)).toBeVisible();
  await expect(Locators.orderNumber(page)).toBeVisible();
  await expect(page).toHaveURL(/\/checkout\/confirmation\/\d+/);
});
