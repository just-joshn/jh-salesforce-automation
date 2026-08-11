import type { APIRequestContext, APIResponse } from '@playwright/test';

import { findOrderableVariant } from '../../support/products';
import { bearer, withSite } from '../../support/scapi';
import type { Basket, ShippingMethodResult } from '../../support/scapi-types';
import {
  basketIdFrom,
  createCheckoutInput,
  defaultShipmentIdFrom,
  emptyBasketRequest,
  expected,
  shippingMethodIdFrom,
  shippingMethodRequestFor,
  type AddressRequest,
  type BasketInput,
  type BasketPaymentInstrumentRequest,
  type OrderPaymentInput,
  type OrderRequest,
  type ProductItemRequest,
  type ShipmentInput,
  type ShippingMethodRequest,
} from './salesforce-payments.data';
import * as Endpoints from './salesforce-payments.endpoints';

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

export interface PaymentReadyCheckout {
  readonly basket: Basket;
  readonly basketId: string;
  readonly productVariantId: string;
  readonly customerEmail: string;
  readonly shippingAddress1: string;
  readonly shippingPostalCode: string;
  readonly shippingMethodId: string;
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

export const preparePaymentReadyCheckout = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<PaymentReadyCheckout> => {
  const product = await findOrderableVariant(request, accessToken);
  const checkout = createCheckoutInput(product);
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
  const methodsResponse = await getShippingMethods(request, accessToken, {
    basketId,
    shipmentId,
  });
  await requireStatus(methodsResponse, expected.successStatus, 'get shipping methods');
  const methods = (await methodsResponse.json()) as ShippingMethodResult;
  const shippingMethodId = shippingMethodIdFrom(methods);
  const basket = await readBasket(
    await selectShippingMethod(request, accessToken, {
      basketId,
      body: shippingMethodRequestFor(shippingMethodId),
      shipmentId,
    }),
    'select shipping method',
  );
  return {
    basket,
    basketId,
    customerEmail: checkout.customer.email,
    productVariantId: product.variantId,
    shippingAddress1: checkout.shippingAddress.address1,
    shippingMethodId,
    shippingPostalCode: checkout.shippingAddress.postalCode,
  };
};
