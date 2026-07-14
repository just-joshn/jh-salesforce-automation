import { expect, test } from '@playwright/test';
import { getGuestToken } from '../../support/slas';
import * as Actions from './checkout-mixed.actions';
import type { Basket, Order, StoreSearchResult } from './checkout-mixed.data';
import { checkout, lineItems, orderTotalOf, shipmentById, storesOf } from './checkout-mixed.data';

// One order that splits into a delivery shipment and a pickup shipment, each item on the right one.
test('place one order that splits into delivery and pickup shipments', async ({ request }) => {
  const { accessToken } = await getGuestToken(request);

  // find a store stocking the pickup item
  const stores = (await (
    await Actions.searchStores(request, accessToken, checkout.storeQuery)
  ).json()) as StoreSearchResult;
  const store = await Actions.findStoreWithStock(
    request,
    accessToken,
    checkout.pickupVariantId,
    storesOf(stores),
  );
  if (!store) throw new Error('expected a store with the pickup item in stock');

  const created = (await (await Actions.createBasket(request, accessToken)).json()) as Basket;
  const id = created.basketId;

  // delivery item on the default shipment, pickup item on a second shipment
  expect(
    (await Actions.addItem(request, accessToken, id, checkout.deliveryVariantId, 1)).status(),
  ).toBe(200);
  expect(
    (await Actions.createShipment(request, accessToken, id, checkout.pickupShipmentId)).status(),
  ).toBe(200);
  expect(
    (
      await Actions.addItem(request, accessToken, id, checkout.pickupVariantId, 1, {
        inventoryId: store.inventoryId,
        shipmentId: checkout.pickupShipmentId,
      })
    ).status(),
  ).toBe(200);

  // address and method for each shipment
  await Actions.setShippingAddress(
    request,
    accessToken,
    id,
    checkout.pickupShipmentId,
    checkout.address,
  );
  await Actions.assignPickup(
    request,
    accessToken,
    id,
    checkout.pickupShipmentId,
    checkout.pickupMethodId,
    store.id,
  );
  await Actions.setShippingAddress(
    request,
    accessToken,
    id,
    checkout.deliveryShipmentId,
    checkout.address,
  );
  await Actions.setShippingMethod(
    request,
    accessToken,
    id,
    checkout.deliveryShipmentId,
    checkout.deliveryMethodId,
  );
  await Actions.setCustomer(request, accessToken, id, checkout.email);
  await Actions.setBillingAddress(request, accessToken, id, checkout.address);

  const priced = (await (await Actions.getBasket(request, accessToken, id)).json()) as Basket;
  expect(
    (
      await Actions.addPayment(request, accessToken, id, checkout.card, orderTotalOf(priced))
    ).status(),
  ).toBe(200);

  // place the order
  const orderResponse = await Actions.createOrder(request, accessToken, id);
  expect(orderResponse.status()).toBe(200);
  const order = (await orderResponse.json()) as Order;
  expect(order.orderNo).toBeTruthy();

  const items = lineItems(order);
  expect(items).toHaveLength(2);
  const deliveryItems = items.filter((i) => i.productId === checkout.deliveryVariantId);
  const pickupItems = items.filter((i) => i.productId === checkout.pickupVariantId);
  expect(deliveryItems).toHaveLength(1);
  expect(pickupItems).toHaveLength(1);
  expect(deliveryItems[0]?.shipmentId).toBe(checkout.deliveryShipmentId);
  expect(pickupItems[0]?.shipmentId).toBe(checkout.pickupShipmentId);

  const deliveryShipment = shipmentById(order, checkout.deliveryShipmentId);
  const pickupShipment = shipmentById(order, checkout.pickupShipmentId);
  expect(deliveryShipment.shippingMethod?.id).toBe(checkout.deliveryMethodId);
  expect(pickupShipment.shippingMethod?.id).toBe(checkout.pickupMethodId);
  expect(pickupShipment.c_fromStoreId).toBe(store.id);

  // The order saved and can be read back, and the cart is used up.
  expect((await Actions.getOrder(request, accessToken, order.orderNo ?? '')).status()).toBe(200);
  expect((await Actions.getBasket(request, accessToken, id)).status()).toBe(404);
});
