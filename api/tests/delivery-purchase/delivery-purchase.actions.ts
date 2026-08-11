import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, withSite } from '../../support/scapi';
import type { Basket, ShippingMethodResult } from '../../support/scapi-types';
import {
  basketIdFrom,
  defaultShipmentIdFrom,
  emptyBasketRequest,
  expected,
  paymentInstrumentFor,
  shippingMethodIdFrom,
  shippingMethodRequestFor,
  type BasketCustomerInput,
  type BasketItemInput,
  type BasketPaymentInput,
  type CheckoutInput,
  type OrderRequest,
  type ShipmentAddressInput,
  type ShipmentMethodInput,
} from './delivery-purchase.data';
import * as Endpoints from './delivery-purchase.endpoints';

const requestOptions = (accessToken: string) => ({
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
  await requireStatus(response, expected.basketMutationStatus, operation);
  return (await response.json()) as Basket;
};

export interface PreparedBasket {
  readonly basketId: string;
}

export const createBasket = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.post(Endpoints.baskets(), {
    ...requestOptions(accessToken),
    data: emptyBasketRequest,
  });

export const addProductToBasket = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketItemInput,
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(input.basketId), {
    ...requestOptions(accessToken),
    data: input.body,
  });

export const provideContact = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketCustomerInput,
): Promise<APIResponse> =>
  request.put(Endpoints.basketCustomer(input.basketId), {
    ...requestOptions(accessToken),
    data: input.body,
  });

export const provideShippingAddress = async (
  request: APIRequestContext,
  accessToken: string,
  input: ShipmentAddressInput,
): Promise<APIResponse> =>
  request.put(Endpoints.shipmentAddress(input.basketId, input.shipmentId), {
    ...requestOptions(accessToken),
    data: input.body,
    params: withSite({ useAsBilling: 'true' }),
  });

export const selectShippingMethod = async (
  request: APIRequestContext,
  accessToken: string,
  input: ShipmentMethodInput,
): Promise<APIResponse> =>
  request.put(Endpoints.shipmentMethod(input.basketId, input.shipmentId), {
    ...requestOptions(accessToken),
    data: input.body,
  });

export const getShippingMethods = async (
  request: APIRequestContext,
  accessToken: string,
  input: Pick<ShipmentMethodInput, 'basketId' | 'shipmentId'>,
): Promise<APIResponse> =>
  request.get(Endpoints.shipmentMethods(input.basketId, input.shipmentId), {
    ...requestOptions(accessToken),
  });

export const providePayment = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketPaymentInput,
): Promise<APIResponse> =>
  request.post(Endpoints.basketPaymentInstruments(input.basketId), {
    ...requestOptions(accessToken),
    data: input.body,
  });

export const createOrder = async (
  request: APIRequestContext,
  accessToken: string,
  body: OrderRequest,
): Promise<APIResponse> =>
  request.post(Endpoints.orders(), {
    ...requestOptions(accessToken),
    data: body,
  });

const selectDefaultShipping = async (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  shipmentId: string,
): Promise<Basket> => {
  const methodsResponse = await getShippingMethods(request, accessToken, {
    basketId,
    shipmentId,
  });
  await requireStatus(methodsResponse, expected.basketMutationStatus, 'get shipping methods');
  const methods = (await methodsResponse.json()) as ShippingMethodResult;
  return readBasket(
    await selectShippingMethod(request, accessToken, {
      basketId,
      body: shippingMethodRequestFor(shippingMethodIdFrom(methods)),
      shipmentId,
    }),
    'select shipping method',
  );
};

export const prepareReadyBasket = async (
  request: APIRequestContext,
  accessToken: string,
  checkout: CheckoutInput,
): Promise<PreparedBasket> => {
  const createdBasket = await readBasket(await createBasket(request, accessToken), 'create basket');
  const basketId = basketIdFrom(createdBasket);
  const basketWithItem = await readBasket(
    await addProductToBasket(request, accessToken, {
      basketId,
      body: checkout.productItems,
    }),
    'add product',
  );
  const shipmentId = defaultShipmentIdFrom(basketWithItem);
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
  const basketWithShipping = await selectDefaultShipping(
    request,
    accessToken,
    basketId,
    shipmentId,
  );
  await readBasket(
    await providePayment(request, accessToken, {
      basketId,
      body: paymentInstrumentFor(basketWithShipping),
    }),
    'provide payment',
  );
  return { basketId };
};
