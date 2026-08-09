import { env } from '../../../config/env';

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

export interface JourneyProduct {
  readonly name: string;
  readonly path: string;
}

export const credentialSkipReason = 'Requires E2E_ACCOUNT_EMAIL and E2E_ACCOUNT_PASSWORD';

export const accountCredentials: LoginCredentials | undefined =
  env.E2E_ACCOUNT_EMAIL && env.E2E_ACCOUNT_PASSWORD
    ? { email: env.E2E_ACCOUNT_EMAIL, password: env.E2E_ACCOUNT_PASSWORD }
    : undefined;

export const invalidCredentials: LoginCredentials = Object.freeze({
  email: 'invalid-cuj10@example.com',
  password: 'DefinitelyWrong-CUJ10!',
});

export const journeyProduct: JourneyProduct = Object.freeze({
  name: 'Checked Silk Tie',
  path: '/product/25752235M?color=COBATSI',
});
