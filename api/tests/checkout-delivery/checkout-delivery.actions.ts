import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import type { Address, Card } from './checkout-delivery.data';
import * as Endpoints from './checkout-delivery.endpoints';

const authed = (accessToken: string, data?: unknown) => ({
  params: withSite(),
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
  quantity: number,
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(basketId), authed(accessToken, [{ productId, quantity }]));

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
