import { expect, test } from '@playwright/test';
import { getGuestToken } from '../../support/slas';
import * as Actions from './checkout-pickup.actions';
import type { Basket, Order, StoreSearchResult } from './checkout-pickup.data';
import { checkout, lineItems, orderTotalOf, shipmentById, storesOf } from './checkout-pickup.data';

// Guest pickup checkout end to end: the order is assigned to the in-stock store, and the basket is consumed.
test('place a pickup order assigned to the correct store', async ({ request }) => {
  const { accessToken } = await getGuestToken(request);

  // find a store stocking the item
  const stores = (await (
    await Actions.searchStores(request, accessToken, checkout.storeQuery)
  ).json()) as StoreSearchResult;
  expect(stores.total).toBeGreaterThan(0);
  const store = await Actions.findStoreWithStock(
    request,
    accessToken,
    checkout.variantId,
    storesOf(stores),
  );
  if (!store) throw new Error('expected a store with the item in stock');

  const created = (await (await Actions.createBasket(request, accessToken)).json()) as Basket;
  const id = created.basketId;

  // add against the store's stock, then assign pickup
  expect(
    (
      await Actions.addItem(request, accessToken, id, checkout.variantId, 1, store.inventoryId)
    ).status(),
  ).toBe(200);
  expect(
    (
      await Actions.setShippingAddress(
        request,
        accessToken,
        id,
        checkout.shipmentId,
        checkout.address,
      )
    ).status(),
  ).toBe(200);
  expect(
    (
      await Actions.assignPickup(
        request,
        accessToken,
        id,
        checkout.shipmentId,
        checkout.pickupMethodId,
        store.id,
      )
    ).status(),
  ).toBe(200);
  expect((await Actions.setCustomer(request, accessToken, id, checkout.email)).status()).toBe(200);
  expect(
    (await Actions.setBillingAddress(request, accessToken, id, checkout.address)).status(),
  ).toBe(200);

  const priced = (await (await Actions.getBasket(request, accessToken, id)).json()) as Basket;
  const amount = orderTotalOf(priced);
  expect((await Actions.addPayment(request, accessToken, id, checkout.card, amount)).status()).toBe(
    200,
  );

  // place the order
  const orderResponse = await Actions.createOrder(request, accessToken, id);
  expect(orderResponse.status()).toBe(200);
  const order = (await orderResponse.json()) as Order;
  expect(order.orderNo).toBeTruthy();
  const shipment = shipmentById(order, checkout.shipmentId);
  expect(shipment.shippingMethod?.id).toBe(checkout.pickupMethodId);
  expect(shipment.c_fromStoreId).toBe(store.id);
  const item = lineItems(order).find((i) => i.productId === checkout.variantId);
  expect(item?.inventoryId).toBe(store.inventoryId);
  const orderNo = order.orderNo ?? '';

  // order is fetchable and the basket is consumed (404)
  expect((await Actions.getOrder(request, accessToken, orderNo)).status()).toBe(200);
  expect((await Actions.getBasket(request, accessToken, id)).status()).toBe(404);
});
