import { createHash, randomBytes, randomUUID } from 'node:crypto';

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

export interface ResetTokenRequest {
  readonly login: string;
}

export interface PkcePair {
  readonly challenge: string;
  readonly verifier: string;
}

export interface ResetCustomer {
  readonly email: string;
  readonly newPassword: string;
  readonly registration: CustomerRegistrationRequest;
  readonly resetTokenRequest: ResetTokenRequest;
}

export const callbackUri = new URL('/callback', env.E2E_BASE_URL).toString();

export const expected = Object.freeze({
  customerRegistrationStatus: 200,
  loginRedirectStatus: 303,
  passwordActionStatus: 200,
  resetRequestStatus: 200,
  resetTokenStatus: 200,
  unregisteredCallbackStatus: 400,
});

export const unregisteredCallbackMessage = "callback_uri doesn't match the registered callbacks";

export const createPkcePair = (): PkcePair => {
  const verifier = randomBytes(32).toString('base64url');
  return { challenge: createHash('sha256').update(verifier).digest('base64url'), verifier };
};

export const createResetCustomer = (): ResetCustomer => {
  const email = `cuj13-${randomUUID().replaceAll('-', '')}@mailinator.com`;
  return {
    email,
    newPassword: 'Reset0rd!2026',
    registration: {
      customer: { email, firstName: 'CUJ', lastName: 'Reset', login: email },
      password: 'Passw0rd!2026',
    },
    resetTokenRequest: { login: email },
  };
};

export const callbackResetForm = (
  userId: string,
  pkce: PkcePair,
): Readonly<Record<string, string>> => ({
  callback_uri: callbackUri,
  channel_id: env.SFCC_SITE_ID,
  client_id: env.SFCC_CLIENT_ID,
  code_challenge: pkce.challenge,
  mode: 'callback',
  user_id: userId,
});

export const passwordActionForm = (
  actionToken: string,
  customer: ResetCustomer,
  pkce: PkcePair,
): Readonly<Record<string, string>> => ({
  channel_id: env.SFCC_SITE_ID,
  client_id: env.SFCC_CLIENT_ID,
  code_verifier: pkce.verifier,
  new_password: customer.newPassword,
  pwd_action_token: actionToken,
  user_id: customer.email,
});

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const faultMessageFrom = (payload: unknown): string =>
  isRecord(payload) && typeof payload.message === 'string' ? payload.message : '';

export const passwordActionTokenFrom = (payload: unknown): string => {
  if (!isRecord(payload) || typeof payload.resetToken !== 'string') {
    throw new Error('Shopper Customers create-reset-token response carries no resetToken');
  }

  return payload.resetToken;
};

export const accountManagerBasicCredentials = (): string => {
  const clientId = env.E2E_ACCOUNT_MANAGER_CLIENT_ID;
  const clientSecret = env.E2E_ACCOUNT_MANAGER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Account Manager OAuth credentials are required to mint a reset token');
  }

  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
};
