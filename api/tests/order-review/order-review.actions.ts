import type { APIRequestContext, APIResponse } from '@playwright/test';
import { orderExpand } from '../../support/oms';
import { bearer, withSite } from '../../support/scapi';
import type { RegisteredLogin } from '../../support/slas';
import { loginRegisteredShopper } from '../../support/slas';
import type { OrderAddress, OrderPlan, ShopperCredentials } from './order-review.data';
import {
  card,
  historyFirstPageOffset,
  historyPageSize,
  paymentMethodId,
} from './order-review.data';
import * as Endpoints from './order-review.endpoints';

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
  plan: OrderPlan,
): Promise<APIResponse> =>
  request.post(
    Endpoints.basketItems(basketId),
    authed(accessToken, [
      {
        productId: plan.productId,
        quantity: 1,
        ...(plan.inventoryId === undefined ? {} : { inventoryId: plan.inventoryId }),
      },
    ]),
  );
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
  request.put(Endpoints.shipmentAddress(basketId), authed(accessToken, address));
export const setFulfillment = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  plan: OrderPlan,
): Promise<APIResponse> =>
  plan.fromStoreId === undefined
    ? request.put(
        Endpoints.shippingMethod(basketId),
        authed(accessToken, { id: plan.shippingMethodId }),
      )
    : request.patch(
        Endpoints.shipment(basketId),
        authed(accessToken, {
          shippingMethod: { id: plan.shippingMethodId },
          c_fromStoreId: plan.fromStoreId,
        }),
      );
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
export const getCustomerOrders = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.customerOrders(customerId), {
    params: withSite({ expand: 'oms', limit: historyPageSize, offset: historyFirstPageOffset }),
    headers: bearer(accessToken),
  });
export const getProducts = (
  request: APIRequestContext,
  accessToken: string,
  ids: string[],
): Promise<APIResponse> =>
  request.get(Endpoints.products(), {
    params: withSite({ ids: ids.join(','), allImages: 'true' }),
    headers: bearer(accessToken),
  });
export const getOrder = (
  request: APIRequestContext,
  accessToken: string,
  orderNo: string,
): Promise<APIResponse> =>
  request.get(Endpoints.order(orderNo), {
    params: withSite({ expand: orderExpand }),
    headers: bearer(accessToken),
  });
export const getStore = (
  request: APIRequestContext,
  accessToken: string,
  storeId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.stores(), {
    params: withSite({ ids: storeId }),
    headers: bearer(accessToken),
  });
