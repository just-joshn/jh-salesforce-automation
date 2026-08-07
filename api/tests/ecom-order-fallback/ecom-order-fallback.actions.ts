import type { APIRequestContext, APIResponse } from '@playwright/test';
import { orderExpand } from '../../support/oms';
import { bearer, withSite } from '../../support/scapi';
import type { RegisteredLogin } from '../../support/slas';
import { loginRegisteredShopper } from '../../support/slas';
import type { OrderAddress, ShopperCredentials } from './ecom-order-fallback.data';
import { card, deliveryMethodId, paymentMethodId } from './ecom-order-fallback.data';
import * as Endpoints from './ecom-order-fallback.endpoints';

const authed = (accessToken: string, data?: unknown) => ({
  params: withSite(),
  headers: bearer(accessToken),
  ...(data === undefined ? {} : { data }),
});
export const registerCustomer = (
  request: APIRequestContext,
  guestToken: string,
  input: ShopperCredentials,
  address: OrderAddress,
): Promise<APIResponse> =>
  request.post(Endpoints.customers(), {
    ...authed(guestToken),
    data: {
      customer: {
        firstName: address.firstName,
        lastName: address.lastName,
        email: input.email,
        login: input.email,
      },
      password: input.password,
    },
  });
export const signIn = (
  request: APIRequestContext,
  input: ShopperCredentials,
): Promise<RegisteredLogin> => loginRegisteredShopper(request, input.email, input.password);
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
  address: OrderAddress,
): Promise<APIResponse> =>
  request.put(Endpoints.shippingAddress(basketId), authed(accessToken, address));
export const setShippingMethod = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> =>
  request.put(Endpoints.shippingMethod(basketId), authed(accessToken, { id: deliveryMethodId }));
export const setBillingAddress = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  address: OrderAddress,
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
  amount: number,
): Promise<APIResponse> =>
  request.post(
    Endpoints.paymentInstruments(basketId),
    authed(accessToken, { paymentMethodId, paymentCard: card, amount }),
  );
export const placeOrder = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> => request.post(Endpoints.orders(), authed(accessToken, { basketId }));
export const getOrder = (
  request: APIRequestContext,
  accessToken: string,
  orderNo: string,
): Promise<APIResponse> =>
  request.get(Endpoints.order(orderNo), {
    params: withSite({ expand: orderExpand }),
    headers: bearer(accessToken),
  });
