import { createHash, randomBytes } from 'node:crypto';

import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, withSite } from '../../support/scapi';
import type { TokenResponse } from '../../support/scapi-types';
import {
  emptyBasketRequest,
  registeredLoginForm,
  tokenExchangeForm,
  type AddressRequest,
  type BasketInput,
  type BasketItemInput,
  type BasketPaymentInstrumentRequest,
  type CustomerAddressRequest,
  type CustomerInput,
  type CustomerPaymentInstrumentRequest,
  type CustomerRegistrationRequest,
  type CustomerResourceInput,
  type OneTimeCodeRequest,
  type OneTimeCodeVerificationRequest,
  type OrderRequest,
  type OrderResourceInput,
  type ReturningShopper,
  type ShipmentInput,
  type ShipmentResourceInput,
  type ShippingMethodRequest,
} from './one-click-returning.data';
import * as Endpoints from './one-click-returning.endpoints';

export interface RegisteredSession {
  readonly accessToken: string;
  readonly customerId: string;
}

const shopperOptions = (accessToken: string) => ({
  headers: bearer(accessToken),
  params: withSite(),
});

const createPkcePair = (): { readonly challenge: string; readonly verifier: string } => {
  const verifier = randomBytes(32).toString('base64url');
  return {
    challenge: createHash('sha256').update(verifier).digest('base64url'),
    verifier,
  };
};

const tokenFrom = async (response: APIResponse): Promise<TokenResponse> => {
  const payload = (await response.json()) as TokenResponse;
  if (!payload.access_token || !payload.customer_id) {
    throw new Error('SLAS token exchange returned no registered shopper identity');
  }
  return payload;
};

const authorizationCodeFrom = (
  response: APIResponse,
): { readonly code: string; readonly usid: string } => {
  const location = response.headers().location;
  if (!location) {
    throw new Error('SLAS registered login returned no location header');
  }
  const redirect = new URL(location);
  const code = redirect.searchParams.get('code');
  const usid = redirect.searchParams.get('usid');
  if (!code || !usid) {
    throw new Error('SLAS registered login redirect contains no code or usid');
  }
  return { code, usid };
};

export const registerCustomer = async (
  request: APIRequestContext,
  accessToken: string,
  body: CustomerRegistrationRequest,
): Promise<APIResponse> =>
  request.post(Endpoints.customers(), { ...shopperOptions(accessToken), data: body });

export const createCustomerAddress = async (
  request: APIRequestContext,
  accessToken: string,
  input: CustomerInput<CustomerAddressRequest>,
): Promise<APIResponse> =>
  request.post(Endpoints.customerAddresses(input.customerId), {
    ...shopperOptions(accessToken),
    data: input.body,
  });

export const createCustomerPaymentInstrument = async (
  request: APIRequestContext,
  accessToken: string,
  input: CustomerInput<CustomerPaymentInstrumentRequest>,
): Promise<APIResponse> =>
  request.post(Endpoints.customerPaymentInstruments(input.customerId), {
    ...shopperOptions(accessToken),
    data: input.body,
  });

export const createGuestBasket = async (
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

export const loginWithGuestUsid = async (
  request: APIRequestContext,
  shopper: ReturningShopper,
  guestUsid: string,
): Promise<RegisteredSession> => {
  const pkce = createPkcePair();
  const loginResponse = await request.post(Endpoints.registeredLogin(), {
    form: registeredLoginForm(pkce.challenge, guestUsid),
    headers: {
      Authorization: `Basic ${Buffer.from(`${shopper.email}:${shopper.password}`).toString('base64')}`,
    },
    maxRedirects: 0,
  });
  if (loginResponse.status() !== 303) {
    throw new Error(`SLAS registered login failed with HTTP ${loginResponse.status()}`);
  }
  const redirect = authorizationCodeFrom(loginResponse);
  const tokenResponse = await request.post(Endpoints.token(), {
    form: tokenExchangeForm(redirect.code, pkce.verifier, redirect.usid),
  });
  if (tokenResponse.status() !== 200) {
    throw new Error(`SLAS token exchange failed with HTTP ${tokenResponse.status()}`);
  }
  const token = await tokenFrom(tokenResponse);
  return { accessToken: token.access_token, customerId: token.customer_id };
};

export const transferGuestBasket = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.post(Endpoints.transferBasket(), {
    ...shopperOptions(accessToken),
    params: withSite({ merge: 'true' }),
  });

export const requestOneTimeCode = async (
  request: APIRequestContext,
  input: OneTimeCodeRequest,
): Promise<APIResponse> => request.post(Endpoints.passwordlessLogin(), { form: input });

export const verifyOneTimeCode = async (
  request: APIRequestContext,
  input: OneTimeCodeVerificationRequest,
): Promise<APIResponse> => request.post(Endpoints.passwordlessToken(), { form: input });

export const readCustomer = async (
  request: APIRequestContext,
  accessToken: string,
  input: CustomerResourceInput,
): Promise<APIResponse> =>
  request.get(Endpoints.customer(input.customerId), shopperOptions(accessToken));

export const applyCustomer = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketInput<Readonly<{ email: string }>>,
): Promise<APIResponse> =>
  request.put(Endpoints.basketCustomer(input.basketId), {
    ...shopperOptions(accessToken),
    data: input.body,
  });

export const applyShippingAddress = async (
  request: APIRequestContext,
  accessToken: string,
  input: ShipmentInput<AddressRequest>,
): Promise<APIResponse> =>
  request.put(Endpoints.shipmentAddress(input.basketId, input.shipmentId), {
    ...shopperOptions(accessToken),
    data: input.body,
    params: withSite({ useAsBilling: 'true' }),
  });

export const readShippingMethods = async (
  request: APIRequestContext,
  accessToken: string,
  input: ShipmentResourceInput,
): Promise<APIResponse> =>
  request.get(
    Endpoints.shipmentMethods(input.basketId, input.shipmentId),
    shopperOptions(accessToken),
  );

export const applyShippingMethod = async (
  request: APIRequestContext,
  accessToken: string,
  input: ShipmentInput<ShippingMethodRequest>,
): Promise<APIResponse> =>
  request.put(Endpoints.shipmentMethod(input.basketId, input.shipmentId), {
    ...shopperOptions(accessToken),
    data: input.body,
  });

export const applyPayment = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketInput<BasketPaymentInstrumentRequest>,
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
  request.post(Endpoints.orders(), { ...shopperOptions(accessToken), data: body });

export const readOrder = async (
  request: APIRequestContext,
  accessToken: string,
  input: OrderResourceInput,
): Promise<APIResponse> => request.get(Endpoints.order(input.orderNo), shopperOptions(accessToken));
