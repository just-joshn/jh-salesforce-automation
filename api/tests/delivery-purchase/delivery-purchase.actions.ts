import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, withSite } from '../../support/scapi';
import { emptyBasketRequest } from './delivery-purchase.data';
import type {
  BasketCustomerInput,
  BasketItemInput,
  BasketPaymentInput,
  OrderRequest,
  ShipmentAddressInput,
  ShipmentMethodInput,
} from './delivery-purchase.data';
import * as Endpoints from './delivery-purchase.endpoints';

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
