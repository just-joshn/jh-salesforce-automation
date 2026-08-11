import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, withSite } from '../../support/scapi';
import type { Basket, ShippingMethodResult } from '../../support/scapi-types';
import {
  basketIdFrom,
  emptyBasketRequest,
  expected,
  shipmentIdFrom,
  shippingMethodInput,
  type BasketInput,
  type BasketPaymentInstrumentRequest,
  type BasketCustomerInput,
  type BasketItemInput,
  type CheckoutInput,
  type CustomerPaymentInput,
  type CustomerRegistrationRequest,
  type OrderRequest,
  type OtpRequest,
  type OtpVerificationRequest,
  type ShipmentAddressInput,
  type ShipmentMethodInput,
} from './one-click-first-time.data';
import * as Endpoints from './one-click-first-time.endpoints';

const shopperOptions = (accessToken: string) => ({
  headers: bearer(accessToken),
  params: withSite(),
});

const requireStatus = async (
  response: APIResponse,
  status: number,
  operation: string,
): Promise<void> => {
  if (response.status() !== status) {
    throw new Error(`${operation} failed with HTTP ${response.status()}: ${await response.text()}`);
  }
};

const readBasket = async (response: APIResponse, operation: string): Promise<Basket> => {
  await requireStatus(response, expected.successStatus, operation);
  return (await response.json()) as Basket;
};

export const requestOtp = async (
  request: APIRequestContext,
  accessToken: string,
  body: OtpRequest,
): Promise<APIResponse> =>
  request.post(Endpoints.otpRequest(), {
    form: body,
    headers: bearer(accessToken),
  });

export const verifyOtp = async (
  request: APIRequestContext,
  accessToken: string,
  body: OtpVerificationRequest,
): Promise<APIResponse> =>
  request.post(Endpoints.otpVerification(), {
    form: body,
    headers: bearer(accessToken),
  });

export const registerCustomer = async (
  request: APIRequestContext,
  accessToken: string,
  body: CustomerRegistrationRequest,
): Promise<APIResponse> =>
  request.post(Endpoints.customers(), { ...shopperOptions(accessToken), data: body });

export const createBasket = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.post(Endpoints.baskets(), { ...shopperOptions(accessToken), data: emptyBasketRequest });

export const addBasketItem = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketItemInput,
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(input.basketId), {
    ...shopperOptions(accessToken),
    data: input.body,
  });

export const provideContact = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketCustomerInput,
): Promise<APIResponse> =>
  request.put(Endpoints.basketCustomer(input.basketId), {
    ...shopperOptions(accessToken),
    data: input.body,
  });

export const provideShippingAddress = async (
  request: APIRequestContext,
  accessToken: string,
  input: ShipmentAddressInput,
): Promise<APIResponse> =>
  request.put(Endpoints.shipmentAddress(input.basketId, input.shipmentId), {
    headers: bearer(accessToken),
    params: withSite({ useAsBilling: 'true' }),
    data: input.body,
  });

export const readShippingMethods = async (
  request: APIRequestContext,
  accessToken: string,
  input: Pick<ShipmentMethodInput, 'basketId' | 'shipmentId'>,
): Promise<APIResponse> =>
  request.get(
    Endpoints.shipmentMethods(input.basketId, input.shipmentId),
    shopperOptions(accessToken),
  );

export const selectShippingMethod = async (
  request: APIRequestContext,
  accessToken: string,
  input: ShipmentMethodInput,
): Promise<APIResponse> =>
  request.put(Endpoints.shipmentMethod(input.basketId, input.shipmentId), {
    ...shopperOptions(accessToken),
    data: input.body,
  });

export const providePayment = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketInput<BasketPaymentInstrumentRequest>,
): Promise<APIResponse> =>
  request.post(Endpoints.basketPaymentInstruments(input.basketId), {
    ...shopperOptions(accessToken),
    data: input.body,
  });

export const persistCustomerPayment = async (
  request: APIRequestContext,
  accessToken: string,
  input: CustomerPaymentInput,
): Promise<APIResponse> =>
  request.post(Endpoints.customerPaymentInstruments(input.customerId), {
    ...shopperOptions(accessToken),
    data: input.body,
  });

export const createOrder = async (
  request: APIRequestContext,
  accessToken: string,
  body: OrderRequest,
): Promise<APIResponse> =>
  request.post(Endpoints.orders(), {
    ...shopperOptions(accessToken),
    data: body,
  });

export const readOrder = async (
  request: APIRequestContext,
  accessToken: string,
  orderNo: string,
): Promise<APIResponse> => request.get(Endpoints.order(orderNo), shopperOptions(accessToken));

export const prepareOrderReadyBasket = async (
  request: APIRequestContext,
  accessToken: string,
  checkout: CheckoutInput,
): Promise<Basket> => {
  const created = await readBasket(await createBasket(request, accessToken), 'create basket');
  const basketId = basketIdFrom(created);
  const withItem = await readBasket(
    await addBasketItem(request, accessToken, { basketId, body: checkout.items }),
    'add basket item',
  );
  const shipmentId = shipmentIdFrom(withItem);
  await readBasket(
    await provideContact(request, accessToken, { basketId, body: checkout.customer }),
    'provide contact',
  );
  await readBasket(
    await provideShippingAddress(request, accessToken, {
      basketId,
      body: checkout.shippingAddress,
      shipmentId,
    }),
    'provide shipping address',
  );
  const methodsResponse = await readShippingMethods(request, accessToken, {
    basketId,
    shipmentId,
  });
  await requireStatus(methodsResponse, expected.successStatus, 'read shipping methods');
  const methods = (await methodsResponse.json()) as ShippingMethodResult;
  return readBasket(
    await selectShippingMethod(
      request,
      accessToken,
      shippingMethodInput(basketId, shipmentId, methods),
    ),
    'select shipping method',
  );
};
