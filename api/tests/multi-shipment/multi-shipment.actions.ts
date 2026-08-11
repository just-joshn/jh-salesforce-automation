import type { APIRequestContext, APIResponse } from '@playwright/test';

import {
  findTwoDistinctOrderableVariants,
  type OrderableVariant,
} from '../../support/products';
import { bearer, withSite } from '../../support/scapi';
import type { Basket, ShippingMethodResult } from '../../support/scapi-types';
import {
  emptyBasketRequest,
  expected,
  type AddressRequest,
  type BasketInput,
  type OrderRequest,
  type PaymentInstrumentRequest,
  type ProductItemRequest,
  type ShipmentInput,
  type ShipmentRequest,
  type ShippingMethodRequest,
  basketIdFrom,
  defaultShipmentIdFrom,
  defaultShippingMethodIdFrom,
  productItemRequest,
  secondShipmentRequest,
  shippingMethodRequestFor,
} from './multi-shipment.data';
import * as Endpoints from './multi-shipment.endpoints';

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
  await requireStatus(response, expected.mutationStatus, operation);
  return (await response.json()) as Basket;
};

export interface PreparedShipments {
  readonly basket: Basket;
  readonly basketId: string;
  readonly products: readonly [OrderableVariant, OrderableVariant];
  readonly shipmentIds: readonly [string, string];
}

export const createBasket = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.post(Endpoints.baskets(), {
    ...requestOptions(accessToken),
    data: emptyBasketRequest,
  });

export const createShipment = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketInput<ShipmentRequest>,
): Promise<APIResponse> =>
  request.post(Endpoints.basketShipments(input.basketId), {
    ...requestOptions(accessToken),
    data: input.body,
  });

export const addProductToShipment = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketInput<readonly ProductItemRequest[]>,
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(input.basketId), {
    ...requestOptions(accessToken),
    data: input.body,
  });

export const provideContact = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketInput<Readonly<{ email: string }>>,
): Promise<APIResponse> =>
  request.put(Endpoints.basketCustomer(input.basketId), {
    ...requestOptions(accessToken),
    data: input.body,
  });

export const provideShippingAddress = async (
  request: APIRequestContext,
  accessToken: string,
  input: ShipmentInput<AddressRequest>,
): Promise<APIResponse> =>
  request.put(Endpoints.shipmentAddress(input.basketId, input.shipmentId), {
    ...requestOptions(accessToken),
    data: input.body,
    params: withSite({ useAsBilling: 'true' }),
  });

export const getShippingMethods = async (
  request: APIRequestContext,
  accessToken: string,
  input: Omit<ShipmentInput<never>, 'body'>,
): Promise<APIResponse> =>
  request.get(Endpoints.shipmentMethods(input.basketId, input.shipmentId), {
    ...requestOptions(accessToken),
  });

export const selectShippingMethod = async (
  request: APIRequestContext,
  accessToken: string,
  input: ShipmentInput<ShippingMethodRequest>,
): Promise<APIResponse> =>
  request.put(Endpoints.shipmentMethod(input.basketId, input.shipmentId), {
    ...requestOptions(accessToken),
    data: input.body,
  });

export const providePayment = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketInput<PaymentInstrumentRequest>,
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

const addItemsToShipments = async (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  products: readonly [OrderableVariant, OrderableVariant],
  shipmentIds: readonly [string, string],
): Promise<Basket> => {
  await readBasket(
    await addProductToShipment(request, accessToken, {
      basketId,
      body: productItemRequest(products[0], shipmentIds[0]),
    }),
    'add first product to shipment',
  );
  return readBasket(
    await addProductToShipment(request, accessToken, {
      basketId,
      body: productItemRequest(products[1], shipmentIds[1]),
    }),
    'add second product to shipment',
  );
};

export const prepareTwoShipments = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<PreparedShipments> => {
  const products = await findTwoDistinctOrderableVariants(request, accessToken);
  const createdBasket = await readBasket(await createBasket(request, accessToken), 'create basket');
  const basketId = basketIdFrom(createdBasket);
  const firstShipmentId = defaultShipmentIdFrom(createdBasket);
  const secondShipment = secondShipmentRequest();
  await readBasket(
    await createShipment(request, accessToken, { basketId, body: secondShipment }),
    'create second shipment',
  );
  const shipmentIds: readonly [string, string] = [firstShipmentId, secondShipment.shipmentId];
  const basket = await addItemsToShipments(request, accessToken, basketId, products, shipmentIds);
  return { basket, basketId, products, shipmentIds };
};

export const fetchShippingMethods = async (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  shipmentId: string,
): Promise<ShippingMethodResult> => {
  const response = await getShippingMethods(request, accessToken, { basketId, shipmentId });
  await requireStatus(response, expected.mutationStatus, 'get shipping methods');
  return (await response.json()) as ShippingMethodResult;
};

export const selectDefaultShippingMethod = async (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  shipmentId: string,
): Promise<Basket> => {
  const methods = await fetchShippingMethods(request, accessToken, basketId, shipmentId);
  const methodId = defaultShippingMethodIdFrom(methods);
  return readBasket(
    await selectShippingMethod(request, accessToken, {
      basketId,
      body: shippingMethodRequestFor(methodId),
      shipmentId,
    }),
    'select shipping method',
  );
};

