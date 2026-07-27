import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '@playwright/test';
import type { OrderableVariant } from '../../support/products';
import { findOrderableVariants } from '../../support/products';
import { getGuestToken } from '../../support/slas';
import * as Actions from './checkout-pickup.actions';
import type { Basket, Order, Store, StoreSearchResult } from './checkout-pickup.data';
import {
  checkout,
  lineItems,
  orderNumber,
  orderTotalOf,
  shipmentById,
  shippingMethodId,
  storesOf,
} from './checkout-pickup.data';

const pickInStockPair = async (
  request: APIRequestContext,
  accessToken: string,
  variants: OrderableVariant[],
  stores: Store[],
): Promise<{ store: Store; variantId: string }> => {
  for (const candidate of variants) {
    const store = await Actions.findStoreWithStock(
      request,
      accessToken,
      candidate.variantId,
      stores,
    );
    if (store) return { store, variantId: candidate.variantId };
  }
  throw new Error('expected a store with an orderable variant in stock');
};

// Guest pickup order at the store; cart is empty after.
test('place a pickup order assigned to the correct store', async ({ request }) => {
  const { accessToken } = await getGuestToken(request);

  // Pick sizes that are in stock right now.
  const variants = await findOrderableVariants(request, accessToken, {
    masterId: checkout.masterId,
    minCount: 1,
  });

  // Find a store that stocks one size.
  const stores = (await (
    await Actions.searchStores(request, accessToken, checkout.storeQuery)
  ).json()) as StoreSearchResult;
  expect(stores.total).toBeGreaterThan(0);
  const { store, variantId } = await pickInStockPair(
    request,
    accessToken,
    variants,
    storesOf(stores),
  );

  const created = (await (await Actions.createBasket(request, accessToken)).json()) as Basket;
  const id = created.basketId;

  // Add using store stock, set pickup.
  expect(
    (await Actions.addItem(request, accessToken, id, variantId, 1, store.inventoryId)).status(),
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

  // Place the order.
  const orderResponse = await Actions.createOrder(request, accessToken, id);
  expect(orderResponse.status()).toBe(200);
  const order = (await orderResponse.json()) as Order;
  expect(order.orderNo).toBeTruthy();
  const shipment = shipmentById(order, checkout.shipmentId);
  expect(shippingMethodId(shipment)).toBe(checkout.pickupMethodId);
  expect(shipment.c_fromStoreId).toBe(store.id);
  const item = lineItems(order).find((i) => i.productId === variantId);
  expect(item?.inventoryId).toBe(store.inventoryId);
  const orderNo = orderNumber(order);

  // Order loads; cart is gone (404).
  expect((await Actions.getOrder(request, accessToken, orderNo)).status()).toBe(200);
  expect((await Actions.getBasket(request, accessToken, id)).status()).toBe(404);
});
