import { expect, test } from '@playwright/test';
import { findOrderableVariants } from '../../support/products';
import { getGuestToken } from '../../support/slas';
import * as Actions from './cart-pickup.actions';
import type { Basket, Store, StoreSearchResult } from './cart-pickup.data';
import { lineItems, pickup, shipmentById, shippingMethodId, storesOf } from './cart-pickup.data';

// Add a product for pickup at an in-stock store and confirm it persists; a store-less area returns nothing.
test('select an in-stock store and add the product to the basket for pickup', async ({
  request,
}) => {
  const { accessToken } = await getGuestToken(request);

  // Look up variants that are in stock right now; hardcoded ones go stale as stock sells out.
  const variants = await findOrderableVariants(request, accessToken, {
    masterId: pickup.masterId,
    minCount: 1,
  });

  const storeResponse = await Actions.searchStores(request, accessToken, pickup.nearby);
  expect(storeResponse.status()).toBe(200);
  const stores = (await storeResponse.json()) as StoreSearchResult;
  expect(stores.total).toBeGreaterThan(0);
  let selectedStore: Store | undefined;
  let variantId: string | undefined;
  for (const candidate of variants) {
    selectedStore = await Actions.findStoreWithStock(
      request,
      accessToken,
      candidate.variantId,
      storesOf(stores),
    );
    if (selectedStore) {
      variantId = candidate.variantId;
      break;
    }
  }
  if (!selectedStore || !variantId) {
    throw new Error('expected a store with an orderable variant in stock');
  }

  // add the product against the chosen store's stock
  const createResponse = await Actions.createBasket(request, accessToken);
  expect(createResponse.status()).toBe(200);
  const basket = (await createResponse.json()) as Basket;

  const addResponse = await Actions.addItem(
    request,
    accessToken,
    basket.basketId,
    variantId,
    pickup.quantity,
    selectedStore.inventoryId,
  );
  expect(addResponse.status()).toBe(200);
  const afterAdd = (await addResponse.json()) as Basket;
  const item = lineItems(afterAdd)[0];
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
  const persistedShipment = shipmentById(persisted, pickup.shipmentId);
  expect(shippingMethodId(persistedShipment)).toBe(pickup.pickupMethodId);
  expect(persistedShipment.c_fromStoreId).toBe(selectedStore.id);
  const persistedItem = lineItems(persisted).find((entry) => entry.productId === variantId);
  expect(persistedItem?.shipmentId).toBe(pickup.shipmentId);
  expect(persistedItem?.inventoryId).toBe(selectedStore.inventoryId);

  // an area with no stores returns an empty list
  const emptyResponse = await Actions.searchStores(request, accessToken, pickup.empty);
  expect(emptyResponse.status()).toBe(200);
  const empty = (await emptyResponse.json()) as StoreSearchResult;
  expect(empty.total).toBe(0);
  expect(storesOf(empty)).toHaveLength(0);
});
