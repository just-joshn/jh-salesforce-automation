import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import type { Address, Card, Product, Store, StoreSearchQuery } from './checkout-pickup.data';
import * as Endpoints from './checkout-pickup.endpoints';

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

// Return the first candidate store that has the variant orderable in its own stock.
export const findStoreWithStock = async (
  request: APIRequestContext,
  accessToken: string,
  variantId: string,
  stores: Store[],
): Promise<Store | undefined> => {
  for (const store of stores) {
    const response = await getProductAtStore(request, accessToken, variantId, store.inventoryId);
    if (response.status() !== 200) continue;
    const product = (await response.json()) as Product;
    const inventory =
      (product.inventories ?? []).find((entry) => entry.id === store.inventoryId) ??
      product.inventory;
    if (inventory?.orderable) return store;
  }
  return undefined;
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
  inventoryId: string,
): Promise<APIResponse> =>
  request.post(
    Endpoints.basketItems(basketId),
    authed(accessToken, [{ productId, quantity, inventoryId }]),
  );

export const setCustomer = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  email: string,
): Promise<APIResponse> =>
  request.put(Endpoints.customer(basketId), authed(accessToken, { email }));

export const setShippingAddress = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  shipmentId: string,
  address: Address,
): Promise<APIResponse> =>
  request.put(Endpoints.shippingAddress(basketId, shipmentId), authed(accessToken, address));

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
    authed(accessToken, { paymentMethodId: 'CREDIT_CARD', paymentCard: card, amount }),
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
