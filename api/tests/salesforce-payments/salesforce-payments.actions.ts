import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, withSite } from '../../support/scapi';
import { emptyBasketRequest } from './salesforce-payments.data';
import type {
  AddressRequest,
  BasketInput,
  BasketPaymentInstrumentRequest,
  OrderPaymentInput,
  OrderRequest,
  ProductItemRequest,
  ShipmentInput,
  ShippingMethodRequest,
} from './salesforce-payments.data';
import * as Endpoints from './salesforce-payments.endpoints';

const requestOptions = (accessToken: string) => ({
  headers: bearer(accessToken),
  params: withSite(),
});

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
  input: Pick<ShipmentInput<never>, 'basketId' | 'shipmentId'>,
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

export const getPaymentMethods = async (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.basketPaymentMethods(basketId), {
    ...requestOptions(accessToken),
  });

export const selectPaymentMethod = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketInput<BasketPaymentInstrumentRequest>,
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

export const updateOrderPaymentInstrument = async (
  request: APIRequestContext,
  accessToken: string,
  input: OrderPaymentInput,
): Promise<APIResponse> =>
  request.patch(Endpoints.orderPaymentInstrument(input.orderNo, input.paymentInstrumentId), {
    ...requestOptions(accessToken),
    data: input.body,
  });

export const readOrder = async (
  request: APIRequestContext,
  accessToken: string,
  orderNo: string,
): Promise<APIResponse> =>
  request.get(Endpoints.order(orderNo), {
    ...requestOptions(accessToken),
  });

export const readShopperConfigurations = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.get(Endpoints.shopperConfigurations(), {
    headers: bearer(accessToken),
    params: withSite(),
  });
