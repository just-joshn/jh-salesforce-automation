import { findUiOrderableVariant } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import * as Actions from './checkout-delivery.actions';
import { checkout } from './checkout-delivery.data';
import * as Locators from './checkout-delivery.locators';

// Guest (not signed in) completes a delivery purchase through to the order confirmation.
test('complete a guest delivery purchase and see order confirmation', async ({ page, request }) => {
  // Guest checkout is a long flow on the shared demo store.
  test.setTimeout(120000);

  // Look up a variant that is in stock right now; hardcoded ones go stale as stock sells out.
  const { accessToken } = await getGuestToken(request);
  const variant = await findUiOrderableVariant(request, accessToken, checkout.masterId);

  await Actions.openProduct(page, variant.masterId);
  await Actions.selectVariation(page, 'Color');
  await Actions.selectSize(page, variant.sizeName);
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
