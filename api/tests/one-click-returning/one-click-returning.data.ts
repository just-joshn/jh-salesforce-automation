import { randomUUID } from 'node:crypto';

import { env } from '../../../config/env';
import type { OrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type { Basket } from '../../support/scapi-types';

export interface ReturningShopper {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly password: string;
}

export interface CustomerRegistrationRequest {
  readonly customer: {
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly login: string;
  };
  readonly password: string;
}

export interface BasketItemInput {
  readonly basketId: string;
  readonly body: readonly { readonly productId: string; readonly quantity: number }[];
}

export const expected = Object.freeze({ successStatus: 200 });
export const emptyBasketRequest = Object.freeze({});

export const createReturningShopper = (): ReturningShopper =>
  Object.freeze({
    email: `cuj4-api-${Date.now()}-${randomUUID().replaceAll('-', '')}@mailinator.com`,
    firstName: 'CUJ',
    lastName: 'Returning',
    password: 'Passw0rd!2026',
  });

export const customerRegistrationFor = (shopper: ReturningShopper): CustomerRegistrationRequest =>
  Object.freeze({
    customer: Object.freeze({
      email: shopper.email,
      firstName: shopper.firstName,
      lastName: shopper.lastName,
      login: shopper.email,
    }),
    password: shopper.password,
  });

export const basketItemFor = (basket: Basket, variant: OrderableVariant): BasketItemInput => ({
  basketId: required(basket.basketId, 'basket.basketId'),
  body: [{ productId: variant.variantId, quantity: 1 }],
});

export const registeredLoginForm = (
  challenge: string,
  guestUsid: string,
): Readonly<Record<string, string>> => ({
  channel_id: env.SFCC_SITE_ID,
  client_id: env.SFCC_CLIENT_ID,
  code_challenge: challenge,
  redirect_uri: new URL('/callback', env.E2E_BASE_URL).toString(),
  response_type: 'code',
  usid: guestUsid,
});

export const tokenExchangeForm = (
  code: string,
  verifier: string,
  usid: string,
): Readonly<Record<string, string>> => ({
  channel_id: env.SFCC_SITE_ID,
  client_id: env.SFCC_CLIENT_ID,
  code,
  code_verifier: verifier,
  grant_type: 'authorization_code_pkce',
  redirect_uri: new URL('/callback', env.E2E_BASE_URL).toString(),
  usid,
});
