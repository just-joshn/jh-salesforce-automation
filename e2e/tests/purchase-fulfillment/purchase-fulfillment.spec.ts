import { expect, test } from '../../support/fixtures';
import * as Actions from './purchase-fulfillment.actions';
import {
  accountUrlPattern,
  card,
  cartHeading,
  confirmationUrlPattern,
  contactStep,
  deliveryDetails,
  deliveryFulfillment,
  deliveryGroupHeading,
  deliveryGroupLabel,
  deliveryVariant,
  homeAddress,
  orderNumberLabel,
  pickupAddress,
  pickupDetails,
  pickupFulfillment,
  pickupGroupLabel,
  pickupSelection,
  pickupStep,
  registeredShopper,
  savedAddressId,
  secondAddress,
  shipmentLabel,
  shippingAddressStep,
  shopperEmail,
  storeStockLabel,
  twoDeliveryVariants,
} from './purchase-fulfillment.data';
import * as Locators from './purchase-fulfillment.locators';

// CUJ 10 — Complete guest shipped purchase: a shopper with no account carries a
// delivery basket through contact, address, shipping method and payment, and the
// confirmation names the order and what was bought.
test('a guest buys a shipped item and reaches order confirmation', async ({ page, request }) => {
  test.setTimeout(180000);
  const variant = await deliveryVariant(request);

  await Actions.openProduct(page, variant.masterId);
  await Actions.chooseVariant(page, variant);
  await Actions.addToCart(page, 1);

  // Start: a valid, non-empty delivery basket.
  await Actions.openCart(page);
  await expect(Locators.cartHeading(page, cartHeading(1))).toBeVisible();
  await expect(Locators.cartItem(page, variant.variantId)).toBeVisible();
  await expect(Locators.fulfillmentGroup(page, deliveryGroupLabel(1, 1))).toBeVisible();
  await expect(Locators.itemFulfillment(page, variant.variantId)).toHaveValue(deliveryFulfillment);

  await Actions.proceedToCheckout(page);

  await Actions.submitGuestContact(page, shopperEmail);
  await expect(Locators.stepCard(page, contactStep)).toContainText(shopperEmail);

  await Actions.enterShippingAddress(page, homeAddress);

  // The shipping method the basket carries is the one the shopper confirms.
  await Actions.openShippingMethods(page);
  await expect(Locators.shippingMethodChoices(page).first()).toBeChecked();
  await Actions.continueToPayment(page);

  await expect(Locators.billingSameAsShipping(page)).toBeChecked();
  await Actions.enterPayment(page, card);
  await Actions.reviewOrder(page);
  await Actions.placeOrder(page);

  // Success: the order number and its summary are on screen.
  await expect(page).toHaveURL(confirmationUrlPattern);
  await expect(Locators.thankYouHeading(page)).toBeVisible();
  await expect(Locators.orderNumberLine(page)).toBeVisible();
  await expect(Locators.confirmationHeading(page, deliveryDetails)).toBeVisible();
  await expect(Locators.confirmationText(page, homeAddress.address1)).toBeVisible();
  await expect(Locators.confirmationHeading(page, variant.productName)).toBeVisible();
});

// CUJ 11 — Complete registered shipped purchase: a signed-in shopper spends the
// contact details and saved address the account already holds, and the finished
// order shows up in their history.
test('a registered shopper buys with a saved address and finds the order in their history', async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  const credentials = await registeredShopper(request);
  const variant = await deliveryVariant(request);

  await Actions.signIn(page, credentials);
  await expect(page).toHaveURL(accountUrlPattern);

  await Actions.openProduct(page, variant.masterId);
  await Actions.chooseVariant(page, variant);
  await Actions.addToCart(page, 1);

  await Actions.openCart(page);
  await expect(Locators.cartItem(page, variant.variantId)).toBeVisible();
  await Actions.proceedToCheckout(page);

  // Checkout opens on the account's own data: no contact step to fill, and the
  // preferred address from the address book already chosen.
  await expect(Locators.signOut(page)).toBeVisible();
  await expect(Locators.stepCard(page, contactStep)).toContainText(credentials.email);
  await expect(Locators.savedAddressCard(page, 0)).toContainText(homeAddress.address1);
  await expect(Locators.savedAddressRadio(page, savedAddressId)).toBeChecked();
  await Actions.continueWithSavedAddress(page);

  await Actions.openShippingMethods(page);
  await expect(Locators.shippingMethodChoices(page).first()).toBeChecked();
  await Actions.continueToPayment(page);

  await expect(Locators.billingSameAsShipping(page)).toBeChecked();
  await Actions.enterPayment(page, card);
  await Actions.reviewOrder(page);
  await Actions.placeOrder(page);

  await expect(Locators.orderNumberLine(page)).toBeVisible();
  await expect(Locators.confirmationText(page, homeAddress.address1)).toBeVisible();
  const orderNo = await Actions.readOrderNumber(page);

  // Success: the order belongs to the customer and is theirs to find again.
  await Actions.openOrderHistory(page);
  await expect(Locators.orderHistoryEntry(page, orderNumberLabel(orderNo))).toBeVisible({
    timeout: 30000,
  });
});

// CUJ 12 — Complete pickup purchase: the shopper collects in store, so the shelf
// at that store decides what can be bought and the confirmation names the store.
test('a guest buys an item for store pickup and the confirmation names the store', async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  const { store, product } = await pickupSelection(request);

  await Actions.openProduct(page, product.masterId);
  await Actions.chooseVariant(page, product);
  await Actions.selectPickupStore(page, store);

  // The store's own stock is what makes collecting an option at all.
  await expect(Locators.storeStockMessage(page, storeStockLabel(store.name))).toBeVisible({
    timeout: 30000,
  });
  await expect(Locators.pickupRadio(page)).toBeEnabled({ timeout: 30000 });
  await Actions.choosePickup(page);
  await expect(Locators.pickupRadio(page)).toBeChecked();
  await Actions.addToCart(page, 1);

  // The basket holds a pickup shipment, not a delivery one.
  await Actions.openCart(page);
  await expect(Locators.fulfillmentGroup(page, pickupGroupLabel(1, 1))).toBeVisible();
  await expect(Locators.cartText(page, store.name)).toBeVisible();
  await expect(Locators.itemFulfillment(page, product.variantId)).toHaveValue(pickupFulfillment);

  await Actions.proceedToCheckout(page);
  await Actions.submitGuestContact(page, shopperEmail);
  await expect(Locators.stepCard(page, pickupStep)).toContainText(store.name);

  await Actions.enterPayment(page, card);
  await Actions.enterBillingAddress(page, homeAddress);
  await Actions.reviewOrder(page);
  await Actions.placeOrder(page);

  // Success: the confirmation identifies the pickup shipment and its store.
  await expect(page).toHaveURL(confirmationUrlPattern);
  await expect(Locators.orderNumberLine(page)).toBeVisible();
  await expect(Locators.confirmationHeading(page, pickupDetails)).toBeVisible();
  await expect(Locators.confirmationHeading(page, pickupAddress)).toBeVisible();
  await expect(Locators.confirmationText(page, store.name)).toBeVisible();
});

// CUJ 13 — Complete mixed pickup-and-delivery purchase: one basket, two ways of
// handing over, one payment, and a confirmation carrying both groups.
test('a guest buys one item for pickup and another for delivery in a single order', async ({
  page,
  request,
}) => {
  test.setTimeout(300000);
  const { store, product } = await pickupSelection(request);
  const shipped = await deliveryVariant(request);

  await Actions.openProduct(page, product.masterId);
  await Actions.chooseVariant(page, product);
  await Actions.selectPickupStore(page, store);
  await expect(Locators.storeStockMessage(page, storeStockLabel(store.name))).toBeVisible({
    timeout: 30000,
  });
  await Actions.choosePickup(page);
  await Actions.addToCart(page, 1);

  await Actions.openProduct(page, shipped.masterId);
  await Actions.chooseVariant(page, shipped);
  await Actions.addToCart(page, 2);

  // Start: the basket carries a populated pickup shipment and a delivery one.
  await Actions.openCart(page);
  await expect(Locators.cartHeading(page, cartHeading(2))).toBeVisible();
  await expect(Locators.fulfillmentGroup(page, pickupGroupLabel(1, 2))).toBeVisible();
  await expect(Locators.fulfillmentGroup(page, deliveryGroupLabel(1, 2))).toBeVisible();

  await Actions.proceedToCheckout(page);
  await Actions.submitGuestContact(page, shopperEmail);

  // Checkout asks for both hand-overs: the store to collect from, and where the
  // rest of the basket ships to.
  await expect(Locators.stepCard(page, pickupStep)).toContainText(store.name);
  await expect(Locators.stepCard(page, shippingAddressStep)).toBeVisible();
  await Actions.enterShippingAddress(page, homeAddress);

  await Actions.openShippingMethods(page);
  await Actions.continueToPayment(page);

  // One payment covers the whole basket.
  await expect(Locators.billingSameAsShipping(page)).toBeChecked();
  await Actions.enterPayment(page, card);
  await Actions.reviewOrder(page);
  await Actions.placeOrder(page);

  // Success: one order confirmation holding both fulfillment groups.
  await expect(Locators.orderNumberLine(page)).toBeVisible();
  await expect(Locators.confirmationHeading(page, pickupDetails)).toBeVisible();
  await expect(Locators.confirmationText(page, store.name)).toBeVisible();
  await expect(Locators.confirmationHeading(page, deliveryDetails)).toBeVisible();
  await expect(Locators.confirmationText(page, homeAddress.address1)).toBeVisible();
});

// CUJ 14 — Complete multi-address purchase: two lines, two destinations, one
// order, and every line accounted for on a shipment of its own.
test('a guest sends two items to two different addresses in one order', async ({
  page,
  request,
}) => {
  test.setTimeout(300000);
  const [first, second] = await twoDeliveryVariants(request);

  await Actions.openProduct(page, first.masterId);
  await Actions.chooseVariant(page, first);
  await Actions.addToCart(page, 1);

  await Actions.openProduct(page, second.masterId);
  await Actions.chooseVariant(page, second);
  await Actions.addToCart(page, 2);

  // Start: both lines sit on one delivery shipment and need splitting.
  await Actions.openCart(page);
  await expect(Locators.fulfillmentGroup(page, deliveryGroupLabel(2, 2))).toBeVisible();

  await Actions.proceedToCheckout(page);
  await Actions.submitGuestContact(page, shopperEmail);
  await expect(Locators.shippingAddressForm(page)).toBeVisible();

  await Actions.shipToMultipleAddresses(page);
  await expect(Locators.multiShippingCards(page)).toHaveCount(2);
  await expect(Locators.multiShippingCardFor(page, first.productName)).toHaveCount(1);
  await expect(Locators.multiShippingCardFor(page, second.productName)).toHaveCount(1);

  await Actions.addAddressForProduct(page, first.productName, homeAddress);
  await Actions.addAddressForProduct(page, second.productName, secondAddress);

  // Every line now names the destination it was assigned.
  await expect(Locators.selectedAddressFor(page, first.productName)).toContainText(
    homeAddress.address1,
  );
  await expect(Locators.selectedAddressFor(page, second.productName)).toContainText(
    secondAddress.address1,
  );
  await Actions.continueWithMultipleAddresses(page);

  // Each shipment gets its own method choice, named after its recipient.
  await Actions.openShippingMethods(page);
  await expect(Locators.shipmentHeading(page, shipmentLabel(homeAddress))).toBeVisible();
  await expect(Locators.shipmentHeading(page, shipmentLabel(secondAddress))).toBeVisible();
  await Actions.continueToPayment(page);

  await Actions.enterPayment(page, card);
  await Actions.reviewOrder(page);
  await Actions.placeOrder(page);

  // Success: both destinations appear, and no empty third shipment survived.
  await expect(Locators.orderNumberLine(page)).toBeVisible();
  await expect(Locators.confirmationHeading(page, deliveryDetails)).toBeVisible();
  await expect(Locators.confirmationHeading(page, deliveryGroupHeading(1))).toBeVisible();
  await expect(Locators.confirmationHeading(page, deliveryGroupHeading(2))).toBeVisible();
  await expect(Locators.confirmationHeading(page, deliveryGroupHeading(3))).toHaveCount(0);
  await expect(Locators.confirmationText(page, homeAddress.address1)).toBeVisible();
  await expect(Locators.confirmationText(page, secondAddress.address1)).toBeVisible();
});
