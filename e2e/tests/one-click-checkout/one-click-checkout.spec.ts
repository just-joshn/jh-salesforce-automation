import { expect, test } from '../../support/fixtures';
import * as Actions from './one-click-checkout.actions';
import {
  accountUrlPattern,
  basketApplyCall,
  card,
  confirmationUrlPattern,
  deliveryVariant,
  oneClickCondition,
  orderCreateCall,
  savedCheckoutDataCall,
  savedDataShopper,
} from './one-click-checkout.data';
import * as Locators from './one-click-checkout.locators';

// CUJ 18 — Complete one-click checkout using saved identity data: a returning
// shopper reaches checkout with a valid basket, the enabled feature replaces the
// whole checkout implementation with a page that coordinates the account's own
// data, and the order is placed from saved or newly saved checkout data
// (SLAS + Shopper Customers + Shopper Baskets V2 + Shopper Orders).
//
// Conditional journey: the one-click route only exists while the storefront is
// configured for it, so the condition is proven from the app's own shipped
// configuration before the browser starts and the test skips with the exact
// reason when it is not met.
test('a returning shopper places an order through one-click checkout', async ({
  page,
  request,
}) => {
  test.setTimeout(300000);

  const condition = await oneClickCondition(request);
  test.skip(!condition.met, condition.reason);

  const shopper = await savedDataShopper(request);
  const variant = await deliveryVariant(request);

  // Authenticate identity: the returning shopper's SLAS session is the verified
  // identity the one-click page builds its saved-data checkout on.
  await Actions.signIn(page, shopper);
  await expect(page).toHaveURL(accountUrlPattern);

  await Actions.openProduct(page, variant.masterId);
  await Actions.chooseVariant(page, variant);
  await Actions.addToCart(page, 1);

  // Start of the journey: checkout is reached with a valid basket, and the
  // enabled feature puts the one-click page there. Retrieving the account's
  // addresses and payment methods is Shopper Customers' part of the journey.
  const retrieved = page.waitForRequest(savedCheckoutDataCall, { timeout: 60000 });
  await Actions.openCheckout(page);
  await retrieved;

  // The identity is already verified, so the page offers a session to leave
  // rather than a token to enter.
  await expect(Locators.signOut(page)).toBeVisible({ timeout: 60000 });
  await expect(Locators.contactInfoHeading(page)).toBeVisible();
  await expect(Locators.savedAddressText(page, shopper.email)).toBeVisible();

  // The retrieved address book entry is the value the page offers to spend.
  await expect(Locators.savedAddressText(page, shopper.address.address1)).toBeVisible({
    timeout: 60000,
  });

  // Apply the chosen values to the basket: Shopper Baskets V2 is written to as
  // the page commits the address and the shipping method.
  const applied = page.waitForRequest(basketApplyCall, { timeout: 60000 });
  await Actions.applySavedAddress(page);
  await applied;
  await Actions.applyShippingMethod(page);

  // Optionally save a new payment instrument: this run takes that branch, so the
  // order is carried by checkout data the shopper has just asked to keep.
  await expect(Locators.paymentComponent(page)).toBeVisible({ timeout: 60000 });
  await Actions.enterAndSaveNewPayment(page, card);

  // Create the order (Shopper Orders).
  const ordered = page.waitForRequest(orderCreateCall, { timeout: 90000 });
  await Actions.placeOrder(page);
  await ordered;

  // Success: the order is placed, and it carries the account's saved address.
  await expect(page).toHaveURL(confirmationUrlPattern);
  await expect(Locators.thankYouHeading(page)).toBeVisible();
  await expect(Locators.orderNumberLine(page)).toBeVisible();
  await expect(Locators.confirmationText(page, shopper.address.address1)).toBeVisible();
});
