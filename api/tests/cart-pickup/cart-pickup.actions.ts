import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import type { Product, Store, StoreSearchQuery } from './cart-pickup.data';
import { orderableInStore } from './cart-pickup.data';
import * as Endpoints from './cart-pickup.endpoints';

export const searchStores = (
  request: APIRequestContext,
  accessToken: string,
  query: StoreSearchQuery,
): Promise<APIResponse> =>
  request.get(Endpoints.storeSearch(), {
    params: withSite({ ...query }),
    headers: bearer(accessToken),
  });

export const getProductAtStore = (
  request: APIRequestContext,
  accessToken: string,
  productId: string,
  inventoryId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.product(productId), {
    params: withSite({ inventoryIds: inventoryId }),
    headers: bearer(accessToken),
  });

// Return the first candidate store that has the variant orderable in its own stock.
export const findStoreWithStock = async (
  request: APIRequestContext,
  accessToken: string,
  variantId: string,
  stores: Store[],
): Promise<Store | undefined> => {
  for (const store of stores) {
    const response = await getProductAtStore(request, accessToken, variantId, store.inventoryId);
    if (
      response.status() === 200 &&
      orderableInStore((await response.json()) as Product, store.inventoryId)
    ) {
      return store;
    }
  }
  return undefined;
};

export const createBasket = (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.post(Endpoints.baskets(), { params: withSite(), headers: bearer(accessToken), data: {} });

// inventoryId ties the line to the chosen store's stock
export const addItem = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  productId: string,
  quantity: number,
  inventoryId: string,
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(basketId), {
    params: withSite(),
    headers: bearer(accessToken),
    data: [{ productId, quantity, inventoryId }],
  });

export const assignPickup = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  shipmentId: string,
  methodId: string,
  storeId: string,
): Promise<APIResponse> =>
  request.patch(Endpoints.shipment(basketId, shipmentId), {
    params: withSite(),
    headers: bearer(accessToken),
    data: { shippingMethod: { id: methodId }, c_fromStoreId: storeId },
  });

export const getBasket = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.basket(basketId), { params: withSite(), headers: bearer(accessToken) });
