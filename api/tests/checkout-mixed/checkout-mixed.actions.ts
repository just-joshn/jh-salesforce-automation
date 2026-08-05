import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { OrderableVariant } from '../../support/products';
import { bearer, withSite } from '../../support/scapi';
import type { Product, StockKeepingStore, Store } from '../../support/scapi-types';
import { stocksInventory } from '../../support/stores';
import type { Address, Card, StoreSearchQuery } from './checkout-mixed.data';
import { orderableInStore, paymentMethodId } from './checkout-mixed.data';
import * as Endpoints from './checkout-mixed.endpoints';

const authed = (accessToken: string, data?: unknown) => ({
  params: withSite(),
  headers: bearer(accessToken),
  ...(data !== undefined ? { data } : {}),
});

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

// First store that has this size in stock.
export const findStoreWithStock = async (
  request: APIRequestContext,
  accessToken: string,
  variantId: string,
  stores: Store[],
): Promise<StockKeepingStore | undefined> => {
  for (const store of stores.filter(stocksInventory)) {
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

// Walk the candidate sizes until one of them is stocked by one of the stores.
export const findStockedStoreVariant = async (
  request: APIRequestContext,
  accessToken: string,
  variants: OrderableVariant[],
  stores: Store[],
): Promise<{ store: StockKeepingStore; variant: OrderableVariant }> => {
  for (const candidate of variants) {
    const store = await findStoreWithStock(request, accessToken, candidate.variantId, stores);
    if (store) return { store, variant: candidate };
  }
  throw new Error('expected a store with the pickup item in stock');
};

export const createBasket = (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> => request.post(Endpoints.baskets(), authed(accessToken, {}));

export const addItem = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  productId: string,
  quantity: number,
  options: { inventoryId?: string; shipmentId?: string } = {},
): Promise<APIResponse> =>
  request.post(
    Endpoints.basketItems(basketId),
    authed(accessToken, [{ productId, quantity, ...options }]),
  );

export const createShipment = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  shipmentId: string,
): Promise<APIResponse> =>
  request.post(Endpoints.shipments(basketId), authed(accessToken, { shipmentId }));

export const setShippingAddress = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  shipmentId: string,
  address: Address,
): Promise<APIResponse> =>
  request.put(Endpoints.shippingAddress(basketId, shipmentId), authed(accessToken, address));

export const setShippingMethod = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  shipmentId: string,
  methodId: string,
): Promise<APIResponse> =>
  request.put(
    Endpoints.shippingMethod(basketId, shipmentId),
    authed(accessToken, { id: methodId }),
  );

export const assignPickup = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  shipmentId: string,
  methodId: string,
  storeId: string,
): Promise<APIResponse> =>
  request.patch(
    Endpoints.shipment(basketId, shipmentId),
    authed(accessToken, { shippingMethod: { id: methodId }, c_fromStoreId: storeId }),
  );

export const setCustomer = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  email: string,
): Promise<APIResponse> =>
  request.put(Endpoints.customer(basketId), authed(accessToken, { email }));

export const setBillingAddress = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  address: Address,
): Promise<APIResponse> =>
  request.put(Endpoints.billingAddress(basketId), authed(accessToken, address));

export const addPayment = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  card: Card,
  amount: number,
): Promise<APIResponse> =>
  request.post(
    Endpoints.paymentInstruments(basketId),
    authed(accessToken, { paymentMethodId, paymentCard: card, amount }),
  );

export const createOrder = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> => request.post(Endpoints.orders(), authed(accessToken, { basketId }));

export const getOrder = (
  request: APIRequestContext,
  accessToken: string,
  orderNo: string,
): Promise<APIResponse> => request.get(Endpoints.order(orderNo), authed(accessToken));

export const getBasket = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> => request.get(Endpoints.basket(basketId), authed(accessToken));
