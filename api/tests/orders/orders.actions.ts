import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import type { RegisteredLogin } from '../../support/slas';
import { loginRegisteredShopper } from '../../support/slas';
import type { Credentials } from './orders.data';
import { address, card, shippingMethodId, variantId } from './orders.data';
import * as Endpoints from './orders.endpoints';

export const registerCustomer = (
  request: APIRequestContext,
  guestToken: string,
  credentials: Credentials,
): Promise<APIResponse> =>
  request.post(Endpoints.customers(), {
    params: withSite(),
    headers: bearer(guestToken),
    data: {
      customer: {
        firstName: 'Test',
        lastName: 'Portfolio',
        email: credentials.email,
        login: credentials.email,
      },
      password: credentials.password,
    },
  });

// sign in a registered shopper (SLAS handshake)
export const signIn = (
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<RegisteredLogin> => loginRegisteredShopper(request, email, password);

// run a full delivery checkout and return the order number
export const placeOrder = async (
  request: APIRequestContext,
  accessToken: string,
  email: string,
): Promise<string> => {
  const authed = { params: withSite(), headers: bearer(accessToken) };
  const created = (await (
    await request.post(Endpoints.baskets(), { ...authed, data: {} })
  ).json()) as { basketId: string };
  const id = created.basketId;
  await request.post(Endpoints.basketItems(id), {
    ...authed,
    data: [{ productId: variantId, quantity: 1 }],
  });
  await request.put(Endpoints.basketCustomer(id), { ...authed, data: { email } });
  await request.put(Endpoints.shippingAddress(id), { ...authed, data: address });
  await request.put(Endpoints.shippingMethod(id), { ...authed, data: { id: shippingMethodId } });
  await request.put(Endpoints.billingAddress(id), { ...authed, data: address });
  const priced = (await (await request.get(Endpoints.basket(id), authed)).json()) as {
    orderTotal: number;
  };
  await request.post(Endpoints.paymentInstruments(id), {
    ...authed,
    data: { paymentMethodId: 'CREDIT_CARD', paymentCard: card, amount: priced.orderTotal },
  });
  const order = (await (
    await request.post(Endpoints.orders(), { ...authed, data: { basketId: id } })
  ).json()) as { orderNo: string };
  return order.orderNo;
};

export const getCustomerOrders = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.customerOrders(customerId), {
    params: withSite(),
    headers: bearer(accessToken),
  });

export const getOrder = (
  request: APIRequestContext,
  accessToken: string,
  orderNo: string,
): Promise<APIResponse> =>
  request.get(Endpoints.order(orderNo), { params: withSite(), headers: bearer(accessToken) });
