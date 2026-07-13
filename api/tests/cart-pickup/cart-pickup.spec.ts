import { expect, test } from '@playwright/test';
import { getGuestToken } from '../../support/slas';
import * as Actions from './cart-pickup.actions';
import type { Basket, StoreSearchResult } from './cart-pickup.data';
import { pickup } from './cart-pickup.data';

// Add a product for pickup at an in-stock store and confirm it persists; a store-less area returns nothing.
test('select an in-stock store and add the product to the basket for pickup', async ({
  request,
}) => {
  const { accessToken } = await getGuestToken(request);

  const storeResponse = await Actions.searchStores(request, accessToken, pickup.nearby);
  expect(storeResponse.status()).toBe(200);
  const stores = (await storeResponse.json()) as StoreSearchResult;
  expect(stores.total).toBeGreaterThan(0);
  const selectedStore = await Actions.findStoreWithStock(
    request,
    accessToken,
    pickup.variantId,
    stores.data ?? [],
  );
  if (!selectedStore) throw new Error('expected a store with the product in stock');

  // add the product against the chosen store's stock
  const createResponse = await Actions.createBasket(request, accessToken);
  expect(createResponse.status()).toBe(200);
  const basket = (await createResponse.json()) as Basket;

  const addResponse = await Actions.addItem(
    request,
    accessToken,
    basket.basketId,
    pickup.variantId,
    pickup.quantity,
    selectedStore.inventoryId,
  );
  expect(addResponse.status()).toBe(200);
  const afterAdd = (await addResponse.json()) as Basket;
  const item = (afterAdd.productItems ?? [])[0];
  expect(item?.inventoryId).toBe(selectedStore.inventoryId);

  // switch the shipment to in-store pickup
  const assignResponse = await Actions.assignPickup(
    request,
    accessToken,
    basket.basketId,
    pickup.shipmentId,
    pickup.pickupMethodId,
    selectedStore.id,
  );
  expect(assignResponse.status()).toBe(200);

  // re-fetch: pickup method, store, and stock source should persist
  const refetchResponse = await Actions.getBasket(request, accessToken, basket.basketId);
  expect(refetchResponse.status()).toBe(200);
  const persisted = (await refetchResponse.json()) as Basket;
  const persistedShipment = (persisted.shipments ?? []).find(
    (entry) => entry.shipmentId === pickup.shipmentId,
  );
  expect(persistedShipment?.shippingMethod?.id).toBe(pickup.pickupMethodId);
  expect(persistedShipment?.c_fromStoreId).toBe(selectedStore.id);
  const persistedItem = (persisted.productItems ?? []).find(
    (entry) => entry.productId === pickup.variantId,
  );
  expect(persistedItem?.shipmentId).toBe(pickup.shipmentId);
  expect(persistedItem?.inventoryId).toBe(selectedStore.inventoryId);

  // an area with no stores returns an empty list
  const emptyResponse = await Actions.searchStores(request, accessToken, pickup.empty);
  expect(emptyResponse.status()).toBe(200);
  const empty = (await emptyResponse.json()) as StoreSearchResult;
  expect(empty.total).toBe(0);
  expect(empty.data ?? []).toHaveLength(0);
});
