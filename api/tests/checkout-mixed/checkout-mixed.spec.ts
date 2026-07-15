import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '@playwright/test';
import type { OrderableVariant } from '../../support/products';
import { findOrderableVariants } from '../../support/products';
import { getGuestToken } from '../../support/slas';
import * as Actions from './checkout-mixed.actions';
import type { Basket, Order, Store, StoreSearchResult } from './checkout-mixed.data';
import {
  checkout,
  lineItems,
  orderNumber,
  orderTotalOf,
  shipmentById,
  shippingMethodId,
  storesOf,
} from './checkout-mixed.data';

const pickPickupPair = async (
  request: APIRequestContext,
  accessToken: string,
  candidates: OrderableVariant[],
  stores: Store[],
): Promise<{ store: Store; pickupVariant: OrderableVariant }> => {
  for (const candidate of candidates) {
    const store = await Actions.findStoreWithStock(
      request,
      accessToken,
      candidate.variantId,
      stores,
    );
    if (store) return { store, pickupVariant: candidate };
  }
  throw new Error('expected a store with the pickup item in stock');
};

// One order that splits into a delivery shipment and a pickup shipment, each item on the right one.
test('place one order that splits into delivery and pickup shipments', async ({ request }) => {
  const { accessToken } = await getGuestToken(request);

  // Look up two variants that are in stock right now (hardcoded ones go stale): the
  // best-stocked for delivery, and another that some store also stocks for pickup.
  const variants = await findOrderableVariants(request, accessToken, {
    masterId: checkout.masterId,
    minCount: 2,
  });
  const deliveryVariant = variants[0];
  if (!deliveryVariant) throw new Error('expected an orderable delivery variant');

  const stores = (await (
    await Actions.searchStores(request, accessToken, checkout.storeQuery)
  ).json()) as StoreSearchResult;
  const { store, pickupVariant } = await pickPickupPair(
    request,
    accessToken,
    variants.slice(1),
    storesOf(stores),
  );

  const created = (await (await Actions.createBasket(request, accessToken)).json()) as Basket;
  const id = created.basketId;

  // delivery item on the default shipment, pickup item on a second shipment
  expect(
    (await Actions.addItem(request, accessToken, id, deliveryVariant.variantId, 1)).status(),
  ).toBe(200);
  expect(
    (await Actions.createShipment(request, accessToken, id, checkout.pickupShipmentId)).status(),
  ).toBe(200);
  expect(
    (
      await Actions.addItem(request, accessToken, id, pickupVariant.variantId, 1, {
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
  const deliveryItems = items.filter((i) => i.productId === deliveryVariant.variantId);
  const pickupItems = items.filter((i) => i.productId === pickupVariant.variantId);
  expect(deliveryItems).toHaveLength(1);
  expect(pickupItems).toHaveLength(1);
  expect(deliveryItems[0]?.shipmentId).toBe(checkout.deliveryShipmentId);
  expect(pickupItems[0]?.shipmentId).toBe(checkout.pickupShipmentId);

  const deliveryShipment = shipmentById(order, checkout.deliveryShipmentId);
  const pickupShipment = shipmentById(order, checkout.pickupShipmentId);
  expect(shippingMethodId(deliveryShipment)).toBe(checkout.deliveryMethodId);
  expect(shippingMethodId(pickupShipment)).toBe(checkout.pickupMethodId);
  expect(pickupShipment.c_fromStoreId).toBe(store.id);

  // The order saved and can be read back, and the cart is used up.
  expect((await Actions.getOrder(request, accessToken, orderNumber(order))).status()).toBe(200);
  expect((await Actions.getBasket(request, accessToken, id)).status()).toBe(404);
});
