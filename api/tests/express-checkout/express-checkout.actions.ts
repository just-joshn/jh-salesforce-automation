import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, requireStatus, withSite } from '../../support/scapi';
import type { Basket, ShippingMethodResult } from '../../support/scapi-types';
import {
  basketIdFrom,
  emptyBasketRequest,
  expected,
  shipmentIdFrom,
  shippingMethodInput,
} from './express-checkout.data';
import type {
  BasketCustomerInput,
  BasketItemInput,
  BasketPaymentInput,
  CheckoutInput,
  OrderRequest,
  PreparedBasket,
  ShipmentAddressInput,
  ShipmentMethodInput,
} from './express-checkout.data';
import * as Endpoints from './express-checkout.endpoints';

const shopperOptions = (accessToken: string) => ({
  headers: bearer(accessToken),
  params: withSite(),
});

const readBasket = async (response: APIResponse, operation: string): Promise<Basket> => {
  await requireStatus(response, expected.basketMutationStatus, operation);
  return (await response.json()) as Basket;
};

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

export const prepareOrderReadyBasket = async (
  request: APIRequestContext,
  accessToken: string,
  checkout: CheckoutInput,
): Promise<PreparedBasket> => {
  const created = await readBasket(await createBasket(request, accessToken), 'Create basket');
  const basketId = basketIdFrom(created);
  const withItem = await readBasket(
    await addBasketItem(request, accessToken, { basketId, body: checkout.productItems }),
    'Add basket item',
  );
  const shipmentId = shipmentIdFrom(withItem);
  await readBasket(
    await provideContact(request, accessToken, { basketId, body: checkout.customer }),
    'Provide basket contact',
  );
  await readBasket(
    await provideShippingAddress(request, accessToken, {
      basketId,
      body: checkout.shippingAddress,
      shipmentId,
    }),
    'Provide shipping address',
  );
  const methodsResponse = await readShippingMethods(request, accessToken, {
    basketId,
    shipmentId,
  });
  await requireStatus(methodsResponse, expected.basketMutationStatus, 'Read shipping methods');
  const methods = (await methodsResponse.json()) as ShippingMethodResult;
  const basket = await readBasket(
    await selectShippingMethod(
      request,
      accessToken,
      shippingMethodInput(basketId, shipmentId, methods),
    ),
    'Select shipping method',
  );
  return { basket, basketId };
};

export const providePayment = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketPaymentInput,
): Promise<APIResponse> =>
  request.post(Endpoints.basketPaymentInstruments(input.basketId), {
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
