import type { APIRequestContext } from '@playwright/test';
import type { StoreVariant } from '../../support/products';
import { findCategoryProductsInStore, findStoreOrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type { Product, ProductInventory, ProductSearchResult } from '../../support/scapi-types';
import type { NearbyStore, StoreQuery } from '../../support/stores';
import { findNearbyStore } from '../../support/stores';

// Woburn MA: several pickup stores in range, all sharing one store stock.
export const storeArea = {
  countryCode: 'US',
  countryLabel: 'United States',
  postalCode: '01801',
  maxDistance: '100',
} as const;

// Category and page size match the browser journey.
export const category = { id: 'newarrivals', name: 'New Arrivals' } as const;
export const pageSize = 25;

interface PickupAvailability {
  readonly total: number;
  readonly masterIds: string[];
  readonly product: StoreVariant;
}

export const nearbyStore = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<NearbyStore> => {
  const query: StoreQuery = {
    countryCode: storeArea.countryCode,
    postalCode: storeArea.postalCode,
    maxDistance: storeArea.maxDistance,
  };
  return findNearbyStore(request, accessToken, query);
};

export const pickupAvailability = async (
  request: APIRequestContext,
  accessToken: string,
  store: NearbyStore,
): Promise<PickupAvailability> => {
  const { total, masterIds } = await findCategoryProductsInStore(
    request,
    accessToken,
    category.id,
    store.inventoryId,
    pageSize,
  );
  const product = await findStoreOrderableVariant(
    request,
    accessToken,
    masterIds,
    store.inventoryId,
  );
  return { total, masterIds, product };
};

export const categoryTotal = (result: ProductSearchResult): number =>
  required(result.total, 'total');

export const storeInventory = (product: Product, inventoryId: string): ProductInventory => {
  const inventory = required(product.inventories, 'inventories').find(
    (candidate) => candidate.id === inventoryId,
  );
  if (inventory === undefined) {
    throw new Error(`product ${product.id} has no inventory response for ${inventoryId}`);
  }
  return inventory;
};
