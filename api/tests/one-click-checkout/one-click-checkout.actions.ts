import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import type { Address, SavedPaymentCard } from './one-click-checkout.data';
import { paymentMethodId } from './one-click-checkout.data';
import * as Endpoints from './one-click-checkout.endpoints';

const authed = (accessToken: string, data?: unknown, params: Record<string, string> = {}) => ({
  params: withSite(params),
  headers: bearer(accessToken),
  ...(data !== undefined ? { data } : {}),
});

export const createBasket = (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> => request.post(Endpoints.baskets(), authed(accessToken, {}));

export const addItem = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  productId: string,
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(basketId), authed(accessToken, [{ productId, quantity: 1 }]));

export const getSavedCheckoutData = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
): Promise<APIResponse> =>
  request.get(
    Endpoints.customer(customerId),
    authed(accessToken, undefined, { expand: 'addresses,paymentinstruments' }),
  );

export const applySavedAddress = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  shipmentId: string,
  address: Address,
): Promise<APIResponse> =>
  request.put(Endpoints.shippingAddress(basketId, shipmentId), authed(accessToken, address));

export const applyShippingMethod = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  shipmentId: string,
  shippingMethodId: string,
): Promise<APIResponse> =>
  request.put(
    Endpoints.shippingMethod(basketId, shipmentId),
    authed(accessToken, { id: shippingMethodId }),
  );

export const saveCustomerPaymentInstrument = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
  paymentCard: SavedPaymentCard,
): Promise<APIResponse> =>
  request.post(
    Endpoints.customerPaymentInstruments(customerId),
    authed(accessToken, { paymentMethodId, paymentCard }),
  );

export const getBasket = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> => request.get(Endpoints.basket(basketId), authed(accessToken));

export const addBasketPaymentInstrument = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  paymentCard: SavedPaymentCard,
  amount: number,
): Promise<APIResponse> =>
  request.post(
    Endpoints.basketPaymentInstruments(basketId),
    authed(accessToken, { paymentMethodId, paymentCard, amount }),
  );

export const createOrder = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> => request.post(Endpoints.orders(), authed(accessToken, { basketId }));
