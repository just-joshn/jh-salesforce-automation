import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, required, shopperApiUrl, withSite } from './scapi';
import type {
  Product,
  ProductSearchHit,
  ProductSearchResult,
  Store,
  StoreResult,
} from './scapi-types';

const SEED_LOCATION = { latitude: '37.7749', longitude: '-122.4194' } as const;
const STORE_SEARCH_DISTANCE_MILES = '500';
const CATALOG_PAGE_SIZE = 24;

const WHOLE_CATALOG_REFINEMENT = 'cgid=root';

export interface PickupStore {
  readonly inventoryListId: string;
  readonly store: Store;
}

export type UnavailablePickupCombination =
  | { readonly kind: 'found'; readonly productId: string; readonly store: PickupStore }
  | { readonly kind: 'none-found'; readonly reason: string };

const productUrl = (productId: string): string =>
  shopperApiUrl('product/shopper-products', `products/${encodeURIComponent(productId)}`);

const searchUrl = (): string => shopperApiUrl('search/shopper-search', 'product-search');

const storeSearchUrl = (): string => shopperApiUrl('store/shopper-stores', 'store-search');

const requireSuccessfulResponse = async (
  response: APIResponse,
  operation: string,
): Promise<void> => {
  if (response.status() !== 200) {
    throw new Error(`${operation} failed with HTTP ${response.status()}: ${await response.text()}`);
  }
};

const pickupStore = (store: Store): PickupStore | undefined => {
  const inventoryListId = store.inventoryId;
  return inventoryListId ? { inventoryListId, store } : undefined;
};

const searchStores = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<readonly PickupStore[]> => {
  const response = await request.get(storeSearchUrl(), {
    headers: bearer(accessToken),
    params: withSite({
      ...SEED_LOCATION,
      distanceUnit: 'mi',
      maxDistance: STORE_SEARCH_DISTANCE_MILES,
    }),
  });
  await requireSuccessfulResponse(response, 'SCAPI store search');
  const payload = (await response.json()) as StoreResult;
  return (payload.data ?? []).flatMap((store) => {
    const candidate = pickupStore(store);
    return candidate ? [candidate] : [];
  });
};

const searchCatalog = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<readonly ProductSearchHit[]> => {
  const response = await request.get(searchUrl(), {
    headers: bearer(accessToken),
    params: withSite({
      limit: String(CATALOG_PAGE_SIZE),
      refine: WHOLE_CATALOG_REFINEMENT,
    }),
  });
  await requireSuccessfulResponse(response, 'SCAPI product search');
  const payload = (await response.json()) as ProductSearchResult;
  return payload.hits ?? [];
};

const fetchProductAtStore = async (
  request: APIRequestContext,
  accessToken: string,
  productId: string,
  inventoryListId: string,
): Promise<Product> => {
  const response = await request.get(productUrl(productId), {
    headers: bearer(accessToken),
    params: withSite({ expand: 'availability', inventoryIds: inventoryListId }),
  });
  await requireSuccessfulResponse(response, `SCAPI product ${productId}`);
  return (await response.json()) as Product;
};

const hasNoStoreStock = (product: Product): boolean => {
  const inventory = required(product.inventories?.[0], 'product.inventories[0]');
  return !inventory.orderable || inventory.ats === 0;
};

export const findPickupStore = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<PickupStore> => {
  const store = (await searchStores(request, accessToken))[0];
  return required(store, 'store with inventoryId');
};

export const findUnavailablePickupCombination = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<UnavailablePickupCombination> => {
  const stores = await searchStores(request, accessToken);
  const hits = await searchCatalog(request, accessToken);
  for (const store of stores) {
    for (const hit of hits) {
      const product = await fetchProductAtStore(
        request,
        accessToken,
        hit.productId,
        store.inventoryListId,
      );
      if (hasNoStoreStock(product)) {
        return { kind: 'found', productId: hit.productId, store };
      }
    }
  }

  return {
    kind: 'none-found',
    reason: 'No unavailable product/store combination was found in current catalog sample',
  };
};
