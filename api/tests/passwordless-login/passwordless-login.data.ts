import { randomUUID } from 'node:crypto';

import { env } from '../../../config/env';
import type { OrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type { Basket } from '../../support/scapi-types';

export interface BasketItemInput {
  readonly basketId: string;
  readonly body: readonly ProductItemRequest[];
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

export type PasswordlessStartRequest = Readonly<Record<string, string>> & {
  readonly channel_id: string;
  readonly locale: string;
  readonly mode: string;
  readonly user_id: string;
  readonly usid: string;
};

export interface PasswordlessShopper {
  readonly email: string;
  readonly password: string;
  readonly passwordless: PasswordlessStartRequest;
  readonly registration: CustomerRegistrationRequest;
}

interface ProductItemRequest {
  readonly productId: string;
  readonly quantity: number;
}

export const expected = Object.freeze({
  basketStatus: 200,
  customerRegistrationStatus: 200,
  passwordlessStartStatus: 200,
});

export const basketIdFrom = (basket: Basket): string =>
  required(basket.basketId, 'basket.basketId');

const isBasket = (value: unknown): value is Basket =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const basketFrom = (value: unknown): Basket => {
  if (!isBasket(value)) {
    throw new Error('Shopper Baskets response is not a basket object');
  }

  return value;
};

export const createBasketItemInput = (
  basketId: string,
  variant: OrderableVariant,
): BasketItemInput => ({
  basketId,
  body: [{ productId: variant.variantId, quantity: 1 }],
});

export const createPasswordlessShopper = (usid: string): PasswordlessShopper => {
  const email = `cuj11-${randomUUID().replaceAll('-', '')}@mailinator.com`;
  const password = 'Passw0rd!2026';
  return {
    email,
    password,
    passwordless: {
      channel_id: env.SFCC_SITE_ID,
      locale: 'en-us',
      mode: 'email',
      user_id: email,
      usid,
    },
    registration: {
      customer: { email, firstName: 'CUJ', lastName: 'Passwordless', login: email },
      password,
    },
  };
};

export const externalTokenSkipReason = (
  mode: string | undefined,
  landingPath: string | undefined,
): string =>
  `Skipped: passwordless token verification requires an external mailbox (mode: ${String(mode)}, landingPath: ${String(landingPath)}).`;

export const passwordlessStartCredentialSkipReason = (): string =>
  'Skipped: live SLAS passwordless start returned HTTP 401 without Authorization; it requires the unavailable private SLAS client secret (SFCC_CLIENT_SECRET) for Basic client credentials.';
