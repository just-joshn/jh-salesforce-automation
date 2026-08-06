import type { Request } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
import * as Actions from './salesforce-payments.actions';
import {
  basketPrepareCall,
  configurationCall,
  confirmationUrlPattern,
  deliveryVariant,
  expressCheckoutHeading,
  homeAddress,
  orderCreateCall,
  paymentMetadataCall,
  salesforcePaymentsCondition,
  sdkScriptUrl,
  shopperEmail,
} from './salesforce-payments.data';
import * as Locators from './salesforce-payments.locators';

// CUJ 19 — Complete purchase through Salesforce Payments.
//
// The payment SDK and its metadata are loaded, the basket is prepared, the
// payment is confirmed, and one Commerce order is created. The provider may take
// the shopper through its own processing leg on the way.
// Services: Shopper Configuration, Salesforce Payments SDK/backend,
// Shopper Baskets V2, Shopper Orders.
//
// Conditional journey. The feature hook requires both local and server
// enablement, so both are proven before the browser starts:
// - the app's own configuration, for the flag, SDK URL and metadata URL.
// - Shopper Configuration, for the Commerce-side permission.
// The test skips naming the exact reason when any of them is missing.
test('a shopper pays through Salesforce Payments and one order is created', async ({
  page,
  request,
}) => {
  test.setTimeout(300000);

  const condition = await salesforcePaymentsCondition(request);
  test.skip(!condition.met, condition.reason);

  const { placements } = condition;
  const sdkUrl = await sdkScriptUrl(request);
  const variant = await deliveryVariant(request);

  // Success is "created once", so every order call is counted rather than the
  // first one being waited for.
  const orderCalls: Request[] = [];
  page.on('request', (candidate) => {
    if (orderCreateCall(candidate)) orderCalls.push(candidate);
  });

  // Load the payment SDK and its metadata. Three pieces of the storefront's own
  // traffic are read:
  // - the configured SDK bundle.
  // - the metadata proxy fronting the Salesforce Payments backend.
  // - the Shopper Configuration call the feature hook gates itself on.
  const configuration = page.waitForRequest(configurationCall, { timeout: 90000 });
  const sdkLoaded = page.waitForResponse(sdkUrl, { timeout: 90000 });
  const metadata = page.waitForRequest(paymentMetadataCall, { timeout: 90000 });

  await Actions.openProduct(page, variant.masterId);
  await Actions.chooseVariant(page, variant);
  await configuration;
  expect((await sdkLoaded).ok()).toBe(true);
  expect((await metadata).method()).toBe('GET');

  // Start of the journey, first ending: an express method is offered on every
  // surface the site was configured to offer it on.
  if (placements.pdp) {
    await expect(Locators.expressPlacement(page).first()).toBeVisible({ timeout: 60000 });
  }

  await Actions.addToCart(page, 1);

  if (placements.miniCart) {
    await Actions.openMiniCart(page);
    await expect(Locators.expressPlacement(page).first()).toBeVisible({ timeout: 60000 });
  }

  await Actions.openCart(page);
  if (placements.cart) {
    await expect(Locators.expressPlacement(page).first()).toBeVisible({ timeout: 60000 });
  }

  // Prepare the basket: Shopper Baskets V2 is written to as the destination and
  // shipping method the payment amount is calculated from are committed.
  const prepared = page.waitForRequest(basketPrepareCall, { timeout: 90000 });
  await Actions.proceedToCheckout(page);
  await Actions.submitGuestContact(page, shopperEmail);
  await Actions.enterShippingAddress(page, homeAddress);
  await prepared;
  await Actions.openShippingMethods(page);
  await Actions.continueToPayment(page);

  if (placements.checkout) {
    await expect(Locators.expressHeading(page, expressCheckoutHeading)).toBeVisible({
      timeout: 60000,
    });
  }

  // Start of the journey, second ending: the payment sheet. Its inside is built
  // by the SDK, so what is asserted is that the storefront mounted it, not how
  // the provider chose to draw it.
  await expect(Locators.paymentStep(page)).toBeVisible({ timeout: 60000 });
  await expect(Locators.sheetFrames(page).first()).toBeAttached({ timeout: 90000 });

  // Confirm the payment and create the order through the storefront's own
  // control, which is what asks the sheet to confirm.
  await Actions.reviewOrder(page);
  await Actions.confirmPaymentAndPlaceOrder(page);

  // The provider may take the shopper through its own processing leg first, so
  // only the confirmation is required.
  await Actions.awaitOrderConfirmation(page);

  // Success: the payment is confirmed, and exactly one Commerce order exists for
  // it. A provider redirect must not create a second.
  await expect(page).toHaveURL(confirmationUrlPattern);
  await expect(Locators.thankYouHeading(page)).toBeVisible();
  await expect(Locators.orderNumberLine(page)).toBeVisible();
  await expect(Locators.confirmationText(page, homeAddress.address1)).toBeVisible();
  expect(orderCalls).toHaveLength(1);
});
