import type { Request } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
import * as Actions from './guest-account-creation.actions';
import {
  accountUrlPattern,
  addressWriteCall,
  card,
  confirmationUrlPattern,
  createAccountHeading,
  deliveryGroupLabel,
  guestAccountCondition,
  hasAddress,
  orderIdentityFrom,
  orderResourceResponse,
  registerCall,
  registrant,
  savedAddressesFor,
  sharedAddress,
  thankYouHeading,
  twoDeliveryVariants,
} from './guest-account-creation.data';
import * as Locators from './guest-account-creation.locators';

// CUJ 20: Create account after guest purchase, preserving order addresses.
//
// A guest finishes checking out. The confirmation offers to turn that purchase
// into an account. Registering derives the customer and their address book from
// the order itself, with duplicate delivery addresses collapsing to one saved
// entry. Services: Shopper Orders, Shopper Customers, SLAS.
//
// Conditional journey. The confirmation page renders the account form only while
// one-click checkout is disabled. So that condition is proven from the app's own
// shipped configuration before the browser starts, and the test skips naming the
// exact reason when it is not met.
test('a guest turns a finished purchase into an account carrying the order addresses', async ({
  page,
  request,
}) => {
  // The order carries two shipments, so checkout stays busy through two
  // shipping-method writes before it will leave that step.
  test.setTimeout(420000);

  const condition = await guestAccountCondition(request);
  test.skip(!condition.met, condition.reason);

  const who = registrant();
  const [first, second] = await twoDeliveryVariants(request);

  // Every address write is counted, because the journey's deduplication step is
  // the claim that two identical shipments produce one saved address.
  const addressWrites: Request[] = [];
  page.on('request', (candidate) => {
    if (addressWriteCall(candidate)) addressWrites.push(candidate);
  });

  await Actions.openProduct(page, first.masterId);
  await Actions.chooseVariant(page, first);
  await Actions.addToCart(page, 1);

  await Actions.openProduct(page, second.masterId);
  await Actions.chooseVariant(page, second);
  await Actions.addToCart(page, 2);

  await Actions.openCart(page);
  await expect(Locators.cartItem(page, first.variantId)).toBeVisible();
  await expect(Locators.cartItem(page, second.variantId)).toBeVisible();
  await expect(Locators.fulfillmentGroup(page, deliveryGroupLabel(2, 2))).toBeVisible();

  // Complete the guest purchase. Both lines are sent to one destination, so the
  // order carries the same delivery address more than once.
  await Actions.proceedToCheckout(page);
  await Actions.submitGuestContact(page, who.email);

  await Actions.shipToMultipleAddresses(page);
  await expect(Locators.multiShippingCards(page)).toHaveCount(2);
  await Actions.addSharedAddress(page, first.productName, sharedAddress);
  await expect(Locators.selectedAddressFor(page, first.productName)).toContainText(
    sharedAddress.address1,
  );
  await expect(Locators.selectedAddressFor(page, second.productName)).toContainText(
    sharedAddress.address1,
  );
  await Actions.continueWithAddresses(page);

  await Actions.openShippingMethods(page);
  await Actions.continueToPayment(page);
  await Actions.enterPayment(page, card);
  await Actions.reviewOrder(page);

  // Shopper Orders hands back the finished order, and that is the payload the
  // confirmation page derives the account from.
  const orderResource = page.waitForResponse(orderResourceResponse, { timeout: 120000 });
  await Actions.placeOrder(page);
  const order = await orderIdentityFrom(await orderResource);

  // Start of the journey: the guest is shown the account form on the confirmation.
  await expect(page).toHaveURL(confirmationUrlPattern);
  await expect(Locators.confirmationHeading(page, thankYouHeading)).toBeVisible();
  await expect(Locators.orderNumberLine(page)).toContainText(order.orderNo);
  await expect(Locators.confirmationHeading(page, createAccountHeading)).toBeVisible({
    timeout: 60000,
  });

  // Read order/customer details: the form arrives already carrying what the order
  // says, so the shopper re-enters nothing but a password.
  await expect(Locators.accountEmail(page)).toHaveValue(order.email);
  expect(order.email).toBe(who.email);
  expect(order.firstName).toBe(sharedAddress.firstName);
  expect(order.lastName).toBe(sharedAddress.lastName);
  await expect(Locators.accountPassword(page)).toHaveValue('');

  // The order really does repeat its delivery address. That is what makes the
  // deduplication assertion below a test of behaviour, not of a counter.
  expect(order.deliveryAddresses.length).toBeGreaterThanOrEqual(1);
  expect(order.uniqueAddressCount).toBe(1);

  // Register the Customer and authenticate through SLAS.
  const registered = page.waitForRequest(registerCall, { timeout: 90000 });
  await Actions.createAccount(page, who);
  await registered;

  // Success: a registered session, named from the order instead of from a form
  // the shopper filled in.
  await expect(page).toHaveURL(accountUrlPattern, { timeout: 120000 });
  await expect(Locators.logout(page).first()).toBeAttached();
  await expect(Locators.profileCard(page)).toContainText(`${order.firstName} ${order.lastName}`, {
    timeout: 60000,
  });
  await expect(Locators.profileCard(page)).toContainText(order.email);

  // Deduplicate and save: the repeated delivery address is written once, not once
  // per shipment.
  await expect.poll(() => addressWrites.length, { timeout: 60000 }).toBe(order.uniqueAddressCount);

  // The saved addresses are available for future checkout, both on the account's
  // own address book page and to the commerce API under a fresh session.
  await Actions.openSavedAddresses(page);
  await expect(Locators.savedAddressEntries(page)).toHaveCount(order.uniqueAddressCount, {
    timeout: 60000,
  });
  await expect(Locators.savedAddressEntry(page, sharedAddress.address1)).toBeVisible();

  const saved = await savedAddressesFor(request, who);
  expect(saved).toHaveLength(order.uniqueAddressCount);
  expect(hasAddress(saved, sharedAddress)).toBe(true);
});
