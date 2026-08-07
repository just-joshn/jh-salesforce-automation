import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import type { Address, PaymentCard } from './salesforce-payments.data';
import { paymentMethodId } from './salesforce-payments.data';
import * as Endpoints from './salesforce-payments.endpoints';

const authed = (accessToken: string, data?: unknown, params: Record<string, string> = {}) => ({
  params: withSite(params),
  headers: bearer(accessToken),
  ...(data !== undefined ? { data } : {}),
});

export const getConfigurations = (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.get(Endpoints.configurations(), authed(accessToken, undefined, {}));

export const getConfiguredAsset = (
  request: APIRequestContext,
  accessToken: string,
  url: string,
): Promise<APIResponse> => {
  void accessToken;
  return request.get(Endpoints.configuredAsset(url));
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
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(basketId), authed(accessToken, [{ productId, quantity: 1 }]));

export const setCustomer = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  email: string,
): Promise<APIResponse> =>
  request.put(Endpoints.basketCustomer(basketId), authed(accessToken, { email }));

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

export const setBillingAddress = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  address: Address,
): Promise<APIResponse> =>
  request.put(Endpoints.billingAddress(basketId), authed(accessToken, address));

export const getBasket = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> => request.get(Endpoints.basket(basketId), authed(accessToken));

export const addPayment = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  card: PaymentCard,
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
