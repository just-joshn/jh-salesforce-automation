import type { APIRequestContext } from '@playwright/test';
import { bearer, shopperApiUrl, withSite } from './scapi';

// Find a pickup store and the stock ("inventory") id that goes with it.
// The storefront needs that id to ask whether a product is on the shelf there.

interface StoreEntry {
  id?: string;
  name?: string;
  inventoryId?: string;
}

interface StoreSearchResult {
  total?: number;
  data?: StoreEntry[];
}

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

const isUsable = (entry: StoreEntry): entry is Required<StoreEntry> =>
  entry.id !== undefined && entry.name !== undefined && entry.inventoryId !== undefined;

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

  const result = (await response.json()) as StoreSearchResult;
  const store = (result.data ?? []).find(isUsable);
  if (store === undefined) {
    throw new Error(
      `no store with a stock id was found within ${query.maxDistance}km of ${query.postalCode} ` +
        `(${query.countryCode}); the demo store's store list has likely changed`,
    );
  }
  return { id: store.id, name: store.name, inventoryId: store.inventoryId };
};
