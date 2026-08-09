import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { env } from '../../../config/env';
import type { OrderableVariant } from '../../support/products';

export interface LoginCredentials {
  readonly email: string;
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

export interface PkcePair {
  readonly challenge: string;
  readonly verifier: string;
}

export interface BasketItemRequest {
  readonly productId: string;
  readonly quantity: number;
}

export interface AddBasketItemInput {
  readonly accessToken: string;
  readonly basketId: string;
  readonly items: readonly BasketItemRequest[];
}

export const emptyBasketRequest = Object.freeze({});

export const createCredentials = (): LoginCredentials => ({
  email: `cuj10-${randomUUID()}@mailinator.com`,
  password: 'Passw0rd!2026',
});

export const createInvalidCredentials = (): LoginCredentials => ({
  email: `cuj10-invalid-${randomUUID()}@mailinator.com`,
  password: 'DefinitelyWrong-CUJ10!',
});

export const toCustomerRegistrationRequest = (
  credentials: LoginCredentials,
): CustomerRegistrationRequest => ({
  customer: {
    email: credentials.email,
    firstName: 'CUJ',
    lastName: 'Shopper',
    login: credentials.email,
  },
  password: credentials.password,
});

export const toBasketItemRequest = (variant: OrderableVariant): readonly BasketItemRequest[] => [
  { productId: variant.variantId, quantity: 1 },
];

export const createPkcePair = (): PkcePair => {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { challenge, verifier };
};

export const registeredLoginForm = (
  challenge: string,
  usid: string,
): Readonly<Record<string, string>> => ({
  channel_id: env.SFCC_SITE_ID,
  client_id: env.SFCC_CLIENT_ID,
  code_challenge: challenge,
  redirect_uri: new URL('/callback', env.E2E_BASE_URL).toString(),
  response_type: 'code',
  usid,
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

export const basicAuthorization = (credentials: LoginCredentials): Readonly<Record<string, string>> => ({
  Authorization: `Basic ${Buffer.from(`${credentials.email}:${credentials.password}`).toString('base64')}`,
});
