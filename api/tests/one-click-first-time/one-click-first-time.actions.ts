import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, withSite } from '../../support/scapi';
import { emptyBasketRequest } from './one-click-first-time.data';
import type {
  BasketInput,
  BasketPaymentInstrumentRequest,
  BasketCustomerInput,
  BasketItemInput,
  CustomerPaymentInput,
  CustomerRegistrationRequest,
  OrderRequest,
  OtpRequest,
  OtpVerificationRequest,
  ShipmentAddressInput,
  ShipmentMethodInput,
} from './one-click-first-time.data';
import * as Endpoints from './one-click-first-time.endpoints';

const shopperOptions = (accessToken: string) => ({
  headers: bearer(accessToken),
  params: withSite(),
});

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
