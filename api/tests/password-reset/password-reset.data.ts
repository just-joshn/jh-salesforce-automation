import { randomUUID } from 'node:crypto';

export interface CustomerRegistrationRequest {
  readonly customer: {
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly login: string;
  };
  readonly password: string;
}

export interface ResetTokenRequest {
  readonly login: string;
}

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
    resetTokenRequest: { login: email },
  };
};

export const accountManagerCredentialSkipReason = (): string =>
  'Skipped: live Shopper Customers reset-token request returned HTTP 401 with SLAS bearer tokens; it requires unavailable Account Manager OAuth client credentials for sfcc.shopper-customers.login.';
