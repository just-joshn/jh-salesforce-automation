import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import type { RegisteredLogin } from '../../support/slas';
import { loginRegisteredShopper } from '../../support/slas';
import type { Address, Registrant } from './guest-account-creation.data';
import { deliveryMethodId, paymentCard, paymentMethodId } from './guest-account-creation.data';
import * as Endpoints from './guest-account-creation.endpoints';

const authed = (accessToken: string, data?: unknown) => ({
  params: withSite(),
  headers: bearer(accessToken),
  ...(data === undefined ? {} : { data }),
});
export const createBasket = (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> => request.post(Endpoints.baskets(), authed(accessToken, {}));
export const addItems = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  productIds: string[],
): Promise<APIResponse> =>
  request.post(
    Endpoints.basketItems(basketId),
    authed(
      accessToken,
      productIds.map((productId) => ({ productId, quantity: 1 })),
    ),
  );
export const setCustomer = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  email: string,
): Promise<APIResponse> =>
  request.put(Endpoints.basketCustomer(basketId), authed(accessToken, { email }));
export const createShipment = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  shipmentId: string,
): Promise<APIResponse> =>
  request.post(Endpoints.basketShipments(basketId), authed(accessToken, { shipmentId }));
export const moveItem = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  itemId: string,
  productId: string,
  quantity: number,
  shipmentId: string,
): Promise<APIResponse> =>
  request.patch(
    Endpoints.basketItem(basketId, itemId),
    authed(accessToken, { productId, quantity, shipmentId }),
  );
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
): Promise<APIResponse> =>
  request.put(
    Endpoints.shippingMethod(basketId, shipmentId),
    authed(accessToken, { id: deliveryMethodId }),
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
  amount: number,
): Promise<APIResponse> =>
  request.post(
    Endpoints.paymentInstruments(basketId),
    authed(accessToken, { paymentMethodId, paymentCard, amount }),
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
): Promise<APIResponse> => request.get(Endpoints.order(orderNo), authed(accessToken));
export const registerCustomer = (
  request: APIRequestContext,
  guestToken: string,
  who: Registrant,
  firstName: string,
  lastName: string,
): Promise<APIResponse> =>
  request.post(Endpoints.customers(), {
    ...authed(guestToken),
    data: {
      customer: { firstName, lastName, email: who.email, login: who.email },
      password: who.password,
    },
  });
export const signIn = (request: APIRequestContext, who: Registrant): Promise<RegisteredLogin> =>
  loginRegisteredShopper(request, who.email, who.password);
export const saveAddress = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
  address: Address,
): Promise<APIResponse> =>
  request.post(
    Endpoints.customerAddresses(customerId),
    authed(accessToken, { ...address, addressId: 'Order address' }),
  );
export const getCustomer = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
): Promise<APIResponse> => request.get(Endpoints.customer(customerId), authed(accessToken));
