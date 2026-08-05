import { expect, test } from '@playwright/test';
import { getGuestToken } from '../../support/slas';
import * as Actions from './checkout-mixed.actions';
import type { Basket, Order, StoreSearchResult } from './checkout-mixed.data';
import {
  checkout,
  lineItems,
  orderNumber,
  orderTotalOf,
  orderableVariants,
  requireDeliveryVariant,
  shipmentById,
  shippingMethodId,
  storesOf,
} from './checkout-mixed.data';

// One order: some items ship, some pick up.
test('place one order that splits into delivery and pickup shipments', async ({ request }) => {
  const { accessToken } = await getGuestToken(request);

  // Two in-stock sizes: one to ship, one a store also has for pickup.
  const variants = await orderableVariants(request, accessToken);
  const deliveryVariant = requireDeliveryVariant(variants);

  const stores = (await (
    await Actions.searchStores(request, accessToken, checkout.storeQuery)
  ).json()) as StoreSearchResult;
  const { store, variant: pickupVariant } = await Actions.findStockedStoreVariant(
    request,
    accessToken,
    variants.slice(1),
    storesOf(stores),
  );

  const created = (await (await Actions.createBasket(request, accessToken)).json()) as Basket;
  const id = created.basketId;

  // Ship item on main shipment; pickup on second.
  expect(
    (
      await Actions.addItem(request, accessToken, id, deliveryVariant.variantId, checkout.quantity)
    ).status(),
  ).toBe(200);
  expect(
    (await Actions.createShipment(request, accessToken, id, checkout.pickupShipmentId)).status(),
  ).toBe(200);
  expect(
    (
      await Actions.addItem(request, accessToken, id, pickupVariant.variantId, checkout.quantity, {
        inventoryId: store.inventoryId,
        shipmentId: checkout.pickupShipmentId,
      })
    ).status(),
  ).toBe(200);

  // Address + method per shipment.
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

  // Place the order.
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

  // Order loads; cart is used up.
  expect((await Actions.getOrder(request, accessToken, orderNumber(order))).status()).toBe(200);
  expect((await Actions.getBasket(request, accessToken, id)).status()).toBe(404);
});
