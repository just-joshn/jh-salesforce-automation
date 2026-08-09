import { randomUUID } from 'node:crypto';

import { env } from '../../../config/env';

export interface CustomerRegistrationRequest {
  readonly customer: {
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly login: string;
  };
  readonly password: string;
}

export type ResetTokenRequest = Readonly<Record<string, string>> & {
  readonly channel_id: string;
  readonly locale: string;
  readonly mode: string;
  readonly user_id: string;
};

export interface ResetCustomer {
  readonly email: string;
  readonly registration: CustomerRegistrationRequest;
  readonly resetTokenRequest: ResetTokenRequest;
}

export const expected = Object.freeze({
  customerRegistrationStatus: 200,
  resetTokenStatus: 200,
});

export const createResetCustomer = (): ResetCustomer => {
  const email = `cuj13-${randomUUID().replaceAll('-', '')}@mailinator.com`;
  return {
    email,
    registration: {
      customer: {
        email,
        firstName: 'CUJ',
        lastName: 'Reset',
        login: email,
      },
      password: 'Passw0rd!2026',
    },
    resetTokenRequest: {
      channel_id: env.SFCC_SITE_ID,
      locale: 'en-us',
      mode: 'email',
      user_id: email,
    },
  };
};
