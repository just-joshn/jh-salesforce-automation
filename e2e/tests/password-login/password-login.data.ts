import type { OrderableVariant } from '../../../api/support/products';
import { env } from '../../../config/env';
import { buildPath } from '../../support/site';

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

export interface JourneyProduct {
  readonly name: string;
  readonly path: string;
}

export const credentialSkipReason = 'Requires E2E_ACCOUNT_EMAIL and E2E_ACCOUNT_PASSWORD';

export const registeredBasketItemCount = 1;

export const shoppingPath = buildPath('/');

export const accountCredentials: LoginCredentials | undefined =
  env.E2E_ACCOUNT_EMAIL && env.E2E_ACCOUNT_PASSWORD
    ? { email: env.E2E_ACCOUNT_EMAIL, password: env.E2E_ACCOUNT_PASSWORD }
    : undefined;

export const invalidCredentials: LoginCredentials = Object.freeze({
  email: 'invalid-cuj10@example.com',
  password: 'DefinitelyWrong-CUJ10!',
});

// Resolved at run time: the shared demo discontinues products and runs stock down, so a pinned
// product id fails for reasons unrelated to the journey under test.
export const toJourneyProduct = (variant: OrderableVariant): JourneyProduct =>
  Object.freeze({
    name: variant.productName,
    path: `/product/${variant.productId}?pid=${variant.variantId}`,
  });
