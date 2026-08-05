import type { APIRequestContext } from '@playwright/test';
import type { StoreVariant } from '../../../../api/support/products';
import {
  findCategoryProductsInStore,
  findStoreOrderableVariant,
} from '../../../../api/support/products';
import { getGuestToken } from '../../../../api/support/slas';
import type { NearbyStore, StoreQuery } from '../../../../api/support/stores';
import { findNearbyStore } from '../../../../api/support/stores';

export interface StoreArea {
  /** Country id the store search understands, e.g. US. */
  countryCode: string;
  /** Label the store finder's country picker shows, e.g. United States. */
  countryLabel: string;
  postalCode: string;
  /** Search radius in km. */
  maxDistance: string;
}

// Woburn MA: several pickup stores in range, all sharing one store stock.
export const storeArea: StoreArea = {
  countryCode: 'US',
  countryLabel: 'United States',
  postalCode: '01801',
  maxDistance: '100',
};

// Category the store filter is exercised on; big enough to see the result shrink.
export const category = { id: 'newarrivals', name: 'New Arrivals' };

// Product list page size: how many of the API's results fit on the first page.
export const pageSize = 25;

export interface PickupAvailability {
  store: NearbyStore;
  total: number;
  masterIds: string[];
  product: StoreVariant;
}

// Three systems meet here: which store is nearby (Shopper Stores), what it has
// in the category (Shopper Search on its stock id), and a size actually on the
// shelf (Shopper Products against that same stock id).
export const pickupAvailability = async (
  request: APIRequestContext,
): Promise<PickupAvailability> => {
  const { accessToken } = await getGuestToken(request);

  const query: StoreQuery = {
    countryCode: storeArea.countryCode,
    postalCode: storeArea.postalCode,
    maxDistance: storeArea.maxDistance,
  };
  const store = await findNearbyStore(request, accessToken, query);

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

  return { store, total, masterIds, product };
};

export const resultCount = (total: number): string => `(${total})`;

export const selectedFilterLabel = (storeName: string): string => `In stock at ${storeName}`;

export const removeFilterName = (storeName: string): string =>
  `Remove filter: In stock at ${storeName}`;

export const productUrl =
  (masterId: string) =>
  (url: URL): boolean =>
    url.pathname.includes(`/product/${masterId}`);
