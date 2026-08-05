import { bearer, shopperApiUrl, withSite } from './scapi';
import type { StockKeepingStore, Store, StoreResult } from './scapi-types';
import type { APIRequestContext } from '@playwright/test';

// Find a pickup store and the stock ("inventory") id that goes with it.
// The storefront needs that id to ask whether a product is on the shelf there.

export interface StoreQuery {
  countryCode: string;
  postalCode: string;
  /** Search radius in km. */
  maxDistance: string;
}

export interface NearbyStore {
  id: string;
  name: string;
  inventoryId: string;
}

// A store worth asking about availability at all.
export const stocksInventory = (store: Store): store is StockKeepingStore =>
  store.inventoryId !== undefined;

// The spec guarantees `id`; a store is only usable here if it also names itself
// and carries its own stock id.
type UsableStore = StockKeepingStore & { name: string };

const isUsable = (entry: Store): entry is UsableStore =>
  entry.name !== undefined && stocksInventory(entry);

// Nearest store that has an id, a name and its own stock id.
export const findNearbyStore = async (
  request: APIRequestContext,
  accessToken: string,
  query: StoreQuery,
): Promise<NearbyStore> => {
  const response = await request.get(shopperApiUrl('store/shopper-stores/v1', 'store-search'), {
    params: withSite({ ...query }),
    headers: bearer(accessToken),
  });
  if (!response.ok()) {
    throw new Error(`store search near ${query.postalCode} failed with ${response.status()}`);
  }

  const result = (await response.json()) as StoreResult;
  const store = (result.data ?? []).find(isUsable);
  if (store === undefined) {
    throw new Error(
      `no store with a stock id was found within ${query.maxDistance}km of ${query.postalCode} ` +
        `(${query.countryCode}); the demo store's store list has likely changed`,
    );
  }
  return { id: store.id, name: store.name, inventoryId: store.inventoryId };
};
