import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import type { RegisteredLogin } from '../../support/slas';
import { loginRegisteredShopper } from '../../support/slas';
import type { Credentials } from './orders.data';
import { address, card, shippingMethodId } from './orders.data';
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

// sign in a registered shopper through SLAS (the login API)
export const signIn = (
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<RegisteredLogin> => loginRegisteredShopper(request, email, password);

// run a full delivery checkout for the given variant and return the order number
export const placeOrder = async (
  request: APIRequestContext,
  accessToken: string,
  email: string,
  variantId: string,
): Promise<string> => {
  const authed = { params: withSite(), headers: bearer(accessToken) };
  const created = (await (
    await request.post(Endpoints.baskets(), { ...authed, data: {} })
  ).json()) as { basketId: string };
  const id = created.basketId;
  const added = await request.post(Endpoints.basketItems(id), {
    ...authed,
    data: [{ productId: variantId, quantity: 1 }],
  });
  if (!added.ok()) {
    throw new Error(
      `adding ${variantId} to the basket failed (${added.status()}): ${await added.text()}`,
    );
  }
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
  const orderResponse = await request.post(Endpoints.orders(), {
    ...authed,
    data: { basketId: id },
  });
  if (!orderResponse.ok()) {
    throw new Error(
      `placing the order failed (${orderResponse.status()}): ${await orderResponse.text()}`,
    );
  }
  const order = (await orderResponse.json()) as { orderNo?: string };
  if (!order.orderNo) throw new Error('the placed order came back without an order number');
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
