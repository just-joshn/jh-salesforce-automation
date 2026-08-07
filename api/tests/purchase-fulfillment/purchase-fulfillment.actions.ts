import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import type {
  AddItemOptions,
  Address,
  Card,
  ShopperCredentials,
} from './purchase-fulfillment.data';
import {
  basketCustomerRequest,
  basketItemsRequest,
  moveItemRequest,
  orderRequest,
  paymentRequest,
  pickupShipmentRequest,
  registrationRequest,
  savedAddressRequest,
  shipmentRequest,
  shippingMethodRequest,
} from './purchase-fulfillment.data';
import * as Endpoints from './purchase-fulfillment.endpoints';

const authed = (accessToken: string, data?: unknown) => ({
  params: withSite(),
  headers: bearer(accessToken),
  ...(data !== undefined ? { data } : {}),
});

export const registerCustomer = (
  request: APIRequestContext,
  accessToken: string,
  credentials: ShopperCredentials,
): Promise<APIResponse> =>
  request.post(Endpoints.customers(), authed(accessToken, registrationRequest(credentials)));

export const readCustomer = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
): Promise<APIResponse> => request.get(Endpoints.customer(customerId), authed(accessToken));

export const saveAddress = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
): Promise<APIResponse> =>
  request.post(Endpoints.customerAddresses(customerId), authed(accessToken, savedAddressRequest()));

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
  options: AddItemOptions = {},
): Promise<APIResponse> =>
  request.post(
    Endpoints.basketItems(basketId),
    authed(accessToken, basketItemsRequest(productId, quantity, options)),
  );

export const getBasket = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> => request.get(Endpoints.basket(basketId), authed(accessToken));

export const setCustomer = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  email: string,
): Promise<APIResponse> =>
  request.put(
    Endpoints.basketCustomer(basketId),
    authed(accessToken, basketCustomerRequest(email)),
  );

export const createShipment = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  shipmentId: string,
): Promise<APIResponse> =>
  request.post(
    Endpoints.basketShipments(basketId),
    authed(accessToken, shipmentRequest(shipmentId)),
  );

export const moveItem = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  itemId: string,
  shipmentId: string,
  quantity: number,
): Promise<APIResponse> =>
  request.patch(
    Endpoints.basketItem(basketId, itemId),
    authed(accessToken, moveItemRequest(shipmentId, quantity)),
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
  methodId: string,
): Promise<APIResponse> =>
  request.put(
    Endpoints.shippingMethod(basketId, shipmentId),
    authed(accessToken, shippingMethodRequest(methodId)),
  );

export const assignPickup = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  shipmentId: string,
  storeId: string,
): Promise<APIResponse> =>
  request.patch(
    Endpoints.basketShipment(basketId, shipmentId),
    authed(accessToken, pickupShipmentRequest(storeId)),
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
  source: Card,
  amount: number,
): Promise<APIResponse> =>
  request.post(
    Endpoints.paymentInstruments(basketId),
    authed(accessToken, paymentRequest(source, amount)),
  );

export const createOrder = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> =>
  request.post(Endpoints.orders(), authed(accessToken, orderRequest(basketId)));

export const getCustomerOrders = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
): Promise<APIResponse> => request.get(Endpoints.customerOrders(customerId), authed(accessToken));
