import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, withSite } from '../../support/scapi';
import type { Basket, TokenResponse } from '../../support/scapi-types';
import {
  basicAuthorization,
  createPkcePair,
  emptyBasketRequest,
  registeredLoginForm,
  tokenExchangeForm,
  type AddBasketItemInput,
  type CustomerRegistrationRequest,
  type LoginCredentials,
} from './password-login.data';
import * as Endpoints from './password-login.endpoints';

export interface GuestUsidLoginResult {
  readonly accessToken?: string;
  readonly customerId?: string;
  readonly status: number;
  readonly tokenStatus?: number;
  readonly usid?: string;
}

type TokenRecord = Readonly<Record<string, unknown>>;

interface AuthorizationRedirect {
  readonly code: string;
  readonly usid: string;
}

interface TokenExchangeInput extends AuthorizationRedirect {
  readonly loginStatus: number;
  readonly verifier: string;
}

const isTokenRecord = (value: unknown): value is TokenRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isTokenResponse = (value: unknown): value is TokenResponse =>
  isTokenRecord(value) &&
  typeof value.access_token === 'string' &&
  typeof value.customer_id === 'string' &&
  typeof value.usid === 'string';

const parseAuthorizationRedirect = (response: APIResponse): AuthorizationRedirect => {
  const location = response.headers().location;
  if (!location) {
    throw new Error('SLAS registered login returned no location header');
  }
  const redirect = new URL(location);
  const code = redirect.searchParams.get('code');
  const usid = redirect.searchParams.get('usid');
  if (!code || !usid) {
    throw new Error(`SLAS registered login redirect contains no code or usid: ${location}`);
  }
  return { code, usid };
};

const exchangeAuthorizationCode = async (
  request: APIRequestContext,
  input: TokenExchangeInput,
): Promise<GuestUsidLoginResult> => {
  const response = await request.post(Endpoints.token(), {
    form: tokenExchangeForm(input.code, input.verifier, input.usid),
  });
  if (response.status() !== 200) {
    return { status: input.loginStatus, tokenStatus: response.status() };
  }
  const token: unknown = await response.json();
  if (!isTokenResponse(token)) {
    throw new Error('SLAS token exchange returned an invalid token response');
  }
  return {
    accessToken: token.access_token,
    customerId: token.customer_id,
    status: input.loginStatus,
    tokenStatus: response.status(),
    usid: token.usid,
  };
};

export const registerCustomer = async (
  request: APIRequestContext,
  accessToken: string,
  registration: CustomerRegistrationRequest,
): Promise<APIResponse> =>
  request.post(Endpoints.customers(), {
    data: registration,
    headers: bearer(accessToken),
    params: withSite(),
  });

export const createGuestBasket = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.post(Endpoints.baskets(), {
    data: emptyBasketRequest,
    headers: bearer(accessToken),
    params: withSite(),
  });

export const addBasketItem = async (
  request: APIRequestContext,
  input: AddBasketItemInput,
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(input.basketId), {
    data: input.items,
    headers: bearer(input.accessToken),
    params: withSite(),
  });

export const loginWithGuestUsid = async (
  request: APIRequestContext,
  credentials: LoginCredentials,
  guestUsid: string,
): Promise<GuestUsidLoginResult> => {
  const pkce = createPkcePair();
  const loginResponse = await request.post(Endpoints.registeredLogin(), {
    form: registeredLoginForm(pkce.challenge, guestUsid),
    headers: basicAuthorization(credentials),
    maxRedirects: 0,
  });
  if (loginResponse.status() !== 303) {
    return { status: loginResponse.status() };
  }

  const redirect = parseAuthorizationRedirect(loginResponse);
  return exchangeAuthorizationCode(request, {
    ...redirect,
    loginStatus: loginResponse.status(),
    verifier: pkce.verifier,
  });
};

export const transferGuestBasket = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.post(Endpoints.transferBasket(), {
    headers: bearer(accessToken),
    params: withSite({ merge: 'true' }),
  });

export const hasProduct = (basket: Basket, productId: string): boolean =>
  basket.productItems?.some((item) => item.productId === productId) ?? false;
