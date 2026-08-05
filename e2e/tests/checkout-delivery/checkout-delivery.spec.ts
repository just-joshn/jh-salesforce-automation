import { expect, test } from '../../support/fixtures';
import * as Actions from './checkout-delivery.actions';
import { checkout, confirmationUrlPattern, orderableVariant } from './checkout-delivery.data';
import * as Locators from './checkout-delivery.locators';

// Guest delivery buy through order confirmation.
test('complete a guest delivery purchase and see order confirmation', async ({ page, request }) => {
  // Guest checkout is slow — extra time.
  test.setTimeout(120000);

  const variant = await orderableVariant(request);

  await Actions.openProduct(page, variant.masterId);
  await Actions.selectVariation(page, 'Color');
  await Actions.selectSize(page, variant.sizeName);
  await Actions.addToCart(page);

  await Actions.openCheckout(page);
  await Actions.fillContact(page, checkout.email);
  // Address may be skipped — fill only if shown.
  await Actions.fillShippingAddressIfPresent(page, checkout.address);
  await Actions.fillPayment(page, checkout.card);

  await Actions.placeOrder(page);

  // See thank-you page and order number.
  await expect(Locators.confirmationContainer(page)).toBeVisible({ timeout: 20000 });
  await expect(Locators.thankYouHeading(page)).toBeVisible();
  await expect(Locators.orderNumber(page)).toBeVisible();
  await expect(page).toHaveURL(confirmationUrlPattern);
});
