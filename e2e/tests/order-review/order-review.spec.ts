import { expect, test } from '../../support/fixtures';
import * as Actions from './order-review.actions';
import {
  accountUrlPattern,
  billingAddressSection,
  customerOrdersCall,
  expandValues,
  historyFirstPageOffset,
  historyPageSize,
  itemCountLabel,
  money,
  orderAddress,
  orderDetailCall,
  orderDetailTitle,
  orderDetailUrlPattern,
  orderHistoryTitle,
  orderHistoryUrlPattern,
  orderNumberLabel,
  orderSummarySection,
  paramOf,
  paymentMethodSection,
  pickupAddressSection,
  productsCall,
  quantityLabel,
  recipientLabel,
  requestedIds,
  reviewableOrders,
  shipmentSection,
  shippingAddressSection,
  statePattern,
  storeCityLine,
  storesCall,
  trackingSection,
} from './order-review.data';
import * as Locators from './order-review.locators';

// CUJ 15 — Review order history and order details: a registered shopper looks
// back at what they bought. The history is retrieved from the shopper's own
// order list with the OMS expansion asked for, and each line's product is
// hydrated separately; opening one order asks for that order with its OMS
// shipments, hydrates its products, and resolves the store a pickup shipment is
// collected from. The demo shop does not ingest orders into OMS, so the OMS
// expansion returns no OMS state and every page falls back to the ECOM order —
// which is what each rendered value is checked against here. For the same
// reason the OMS metadata call, which the page only makes for an OMS-backed
// order, does not happen.
test('a registered shopper reviews their order history and opens each order in detail', async ({
  page,
  request,
}) => {
  test.setTimeout(300000);
  const { credentials, delivery, pickup, store } = await reviewableOrders(request);

  await Actions.signIn(page, credentials);
  await expect(page).toHaveURL(accountUrlPattern);

  // Start: the shopper opens order history. It asks Shopper Customers for its
  // own first page of orders, preferring the OMS-expanded state, and asks
  // Shopper Products for each line's details separately.
  const historyCall = page.waitForRequest(customerOrdersCall);
  const deliveryHistoryProducts = page.waitForRequest(productsCall(delivery.productId));
  const pickupHistoryProducts = page.waitForRequest(productsCall(pickup.productId));

  await Actions.openOrderHistory(page);
  await expect(Locators.orderHistoryHeading(page, orderHistoryTitle)).toBeVisible();

  const historyRequest = await historyCall;
  expect(expandValues(historyRequest)).toEqual(['oms']);
  expect(paramOf(historyRequest, 'limit')).toBe(historyPageSize);
  expect(paramOf(historyRequest, 'offset')).toBe(historyFirstPageOffset);
  expect(requestedIds(await deliveryHistoryProducts)).toContain(delivery.productId);
  expect(requestedIds(await pickupHistoryProducts)).toContain(pickup.productId);

  // The shipped order the shopper placed, as the API holds it.
  const shippedEntry = Locators.orderCard(page, orderNumberLabel(delivery.orderNo));
  await expect(shippedEntry).toHaveCount(1);
  await expect(Locators.cardText(shippedEntry, statePattern(delivery.status))).toBeVisible();
  await expect(Locators.cardText(shippedEntry, itemCountLabel(delivery.itemCount))).toBeVisible();
  await expect(
    Locators.cardText(shippedEntry, money(delivery.orderTotal, delivery.currency)),
  ).toBeVisible();
  await expect(
    Locators.cardText(shippedEntry, recipientLabel(delivery.recipientName)),
  ).toBeVisible();
  await expect(Locators.productImage(shippedEntry, delivery.productName)).toBeVisible();

  // The collected order sits in the same history, told apart by its own number.
  const collectedEntry = Locators.orderCard(page, orderNumberLabel(pickup.orderNo));
  await expect(collectedEntry).toHaveCount(1);
  await expect(Locators.cardText(collectedEntry, statePattern(pickup.status))).toBeVisible();
  await expect(Locators.cardText(collectedEntry, itemCountLabel(pickup.itemCount))).toBeVisible();
  await expect(
    Locators.cardText(collectedEntry, money(pickup.orderTotal, pickup.currency)),
  ).toBeVisible();
  await expect(Locators.productImage(collectedEntry, pickup.productName)).toBeVisible();

  // Both lines are hydrated, so anything asked for from here on belongs to the
  // order the shopper opens next.
  const shippedDetailCall = page.waitForRequest(orderDetailCall(delivery.orderNo));
  const shippedDetailProducts = page.waitForRequest(productsCall(delivery.productId));

  await Actions.openOrder(page, orderNumberLabel(delivery.orderNo));
  await expect(page).toHaveURL(orderDetailUrlPattern(delivery.orderNo));

  // Opening an order asks Shopper Orders for it with both OMS expansions, and
  // hydrates its line from Shopper Products.
  expect(expandValues(await shippedDetailCall)).toEqual(['oms', 'oms_shipments']);
  expect(requestedIds(await shippedDetailProducts)).toContain(delivery.productId);

  // Success: the order the shopper opened, its product, its totals, how it is
  // being handed over, and where it currently stands.
  await expect(Locators.orderDetailHeading(page, orderDetailTitle)).toBeVisible();
  await expect(Locators.detailText(page, orderNumberLabel(delivery.orderNo))).toBeVisible();
  await expect(Locators.detailText(page, statePattern(delivery.status))).toBeVisible();
  await expect(Locators.detailSection(page, delivery.productName)).toBeVisible();
  await expect(Locators.detailText(page, quantityLabel(delivery.quantity))).toBeVisible();
  await expect(
    Locators.productImage(Locators.orderDetailPage(page), delivery.productName),
  ).toBeVisible();

  await expect(Locators.detailSection(page, orderSummarySection)).toBeVisible();
  await expect(Locators.orderSummary(page)).toContainText(
    money(delivery.productSubTotal, delivery.currency),
  );
  await expect(Locators.orderSummary(page)).toContainText(
    money(delivery.taxTotal, delivery.currency),
  );
  await expect(Locators.orderSummary(page)).toContainText(
    money(delivery.orderTotal, delivery.currency),
  );
  await expect(Locators.detailSection(page, paymentMethodSection)).toBeVisible();
  await expect(Locators.detailSection(page, billingAddressSection)).toBeVisible();

  // A shipped order is handed over by its shipment: where it goes, by which
  // method, and how far along it is.
  await expect(Locators.detailSection(page, shipmentSection)).toBeVisible();
  await expect(Locators.detailSection(page, shippingAddressSection)).toBeVisible();
  await expect(Locators.orderDetailPage(page)).toContainText(orderAddress.address1);
  await expect(Locators.detailSection(page, trackingSection)).toBeVisible();
  await expect(Locators.trackingText(page, statePattern(delivery.shippingStatus))).toBeVisible();
  await expect(Locators.trackingText(page, delivery.fulfillmentName)).toBeVisible();

  await Actions.returnToOrderHistory(page);
  await expect(page).toHaveURL(orderHistoryUrlPattern);
  await expect(Locators.productImage(collectedEntry, pickup.productName)).toBeVisible();

  // The collected order names the store it is picked up from, which is the only
  // thing that sends the page to Shopper Stores.
  const collectedDetailCall = page.waitForRequest(orderDetailCall(pickup.orderNo));
  const collectedStoreCall = page.waitForRequest(storesCall(store.id));

  await Actions.openOrder(page, orderNumberLabel(pickup.orderNo));
  await expect(page).toHaveURL(orderDetailUrlPattern(pickup.orderNo));

  expect(expandValues(await collectedDetailCall)).toEqual(['oms', 'oms_shipments']);
  expect(pickup.pickupStoreId).toBe(store.id);
  expect(requestedIds(await collectedStoreCall)).toContain(store.id);

  await expect(Locators.orderDetailHeading(page, orderDetailTitle)).toBeVisible();
  await expect(Locators.detailText(page, orderNumberLabel(pickup.orderNo))).toBeVisible();
  await expect(Locators.detailText(page, statePattern(pickup.status))).toBeVisible();
  await expect(Locators.detailSection(page, pickup.productName)).toBeVisible();
  await expect(Locators.detailText(page, quantityLabel(pickup.quantity))).toBeVisible();
  await expect(
    Locators.productImage(Locators.orderDetailPage(page), pickup.productName),
  ).toBeVisible();
  await expect(Locators.orderSummary(page)).toContainText(
    money(pickup.orderTotal, pickup.currency),
  );

  // Success for a collected order: the store Shopper Stores resolved, and the
  // pickup method the shipment carries.
  await expect(Locators.detailSection(page, pickupAddressSection)).toBeVisible();
  await expect(Locators.detailText(page, store.name)).toBeVisible();
  await expect(Locators.detailText(page, store.address1)).toBeVisible();
  await expect(Locators.detailText(page, storeCityLine(store))).toBeVisible();
  await expect(Locators.detailSection(page, trackingSection)).toBeVisible();
  await expect(Locators.trackingText(page, statePattern(pickup.shippingStatus))).toBeVisible();
  await expect(Locators.trackingText(page, pickup.fulfillmentName)).toBeVisible();
});
