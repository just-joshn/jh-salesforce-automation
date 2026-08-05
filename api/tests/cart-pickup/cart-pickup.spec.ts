import { expect, test } from '@playwright/test';
import { required } from '../../support/scapi';
import type { Basket, StoreResult } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import * as Actions from './cart-pickup.actions';
import {
  lineItems,
  orderableVariants,
  pickup,
  shipmentById,
  shippingMethodId,
  storesOf,
} from './cart-pickup.data';

// Pickup at stocked store sticks; empty area → no stores.
test('select an in-stock store and add the product to the basket for pickup', async ({
  request,
}) => {
  const { accessToken } = await getGuestToken(request);
  const variants = await orderableVariants(request, accessToken);

  const storeResponse = await Actions.searchStores(request, accessToken, pickup.nearby);
  expect(storeResponse.status()).toBe(200);
  const stores = (await storeResponse.json()) as StoreResult;
  expect(stores.total).toBeGreaterThan(0);
  const { store: selectedStore, variantId } = await Actions.findStockedStoreVariant(
    request,
    accessToken,
    variants,
    storesOf(stores),
  );

  // Add using that store's stock.
  const createResponse = await Actions.createBasket(request, accessToken);
  expect(createResponse.status()).toBe(200);
  const basket = (await createResponse.json()) as Basket;
  const basketId = required(basket.basketId, 'basketId');

  const addResponse = await Actions.addItem(
    request,
    accessToken,
    basketId,
    variantId,
    pickup.quantity,
    selectedStore.inventoryId,
  );
  expect(addResponse.status()).toBe(200);
  const afterAdd = (await addResponse.json()) as Basket;
  const item = lineItems(afterAdd)[0];
  expect(item?.inventoryId).toBe(selectedStore.inventoryId);

  // Set shipment to pickup.
  const assignResponse = await Actions.assignPickup(
    request,
    accessToken,
    basketId,
    pickup.shipmentId,
    pickup.pickupMethodId,
    selectedStore.id,
  );
  expect(assignResponse.status()).toBe(200);

  // Reload: pickup, store, stock still set.
  const refetchResponse = await Actions.getBasket(request, accessToken, basketId);
  expect(refetchResponse.status()).toBe(200);
  const persisted = (await refetchResponse.json()) as Basket;
  const persistedShipment = shipmentById(persisted, pickup.shipmentId);
  expect(shippingMethodId(persistedShipment)).toBe(pickup.pickupMethodId);
  expect(persistedShipment.c_fromStoreId).toBe(selectedStore.id);
  const persistedItem = lineItems(persisted).find((entry) => entry.productId === variantId);
  expect(persistedItem?.shipmentId).toBe(pickup.shipmentId);
  expect(persistedItem?.inventoryId).toBe(selectedStore.inventoryId);

  // No nearby stores → empty list.
  const emptyResponse = await Actions.searchStores(request, accessToken, pickup.empty);
  expect(emptyResponse.status()).toBe(200);
  const empty = (await emptyResponse.json()) as StoreResult;
  expect(empty.total).toBe(0);
  expect(storesOf(empty)).toHaveLength(0);
});
