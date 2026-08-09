import { createHash, randomBytes } from 'node:crypto';

import type { APIRequestContext, APIResponse } from '@playwright/test';

import { env } from '../../config/env';
import { slasUrl } from './scapi';
import type { TokenResponse } from './scapi-types';

const redirectUri = new URL('/callback', env.E2E_BASE_URL).toString();

interface PkcePair {
  readonly challenge: string;
  readonly verifier: string;
}

interface AuthorizationRedirect {
  readonly code: string;
  readonly usid: string;
}

type TokenRecord = Readonly<Record<string, unknown>>;

export interface RegisteredLoginResult {
  readonly accessToken?: string;
  readonly customerId?: string;
  readonly status: number;
}

export interface AuthenticatedShopper {
  readonly accessToken: string;
  readonly customerId: string;
}

const createPkcePair = (): PkcePair => {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { challenge, verifier };
};

const isTokenRecord = (value: unknown): value is TokenRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isTokenResponse = (value: unknown): value is TokenResponse =>
  isTokenRecord(value) &&
  typeof value.access_token === 'string' &&
  typeof value.customer_id === 'string' &&
  typeof value.usid === 'string';

const responseError = async (operation: string, response: APIResponse): Promise<Error> =>
  new Error(`${operation} failed with HTTP ${response.status()}: ${await response.text()}`);

const locationHeader = (response: APIResponse): string | undefined => {
  const headers = response.headers();
  return Object.entries(headers).find(([name]) => name.toLowerCase() === 'location')?.[1];
};

const parseAuthorizationRedirect = async (
  operation: string,
  response: APIResponse,
): Promise<AuthorizationRedirect> => {
  if (response.status() !== 303) {
    throw await responseError(operation, response);
  }

  const location = locationHeader(response);
  if (!location) {
    throw await responseError(`${operation} returned no location header`, response);
  }

  const redirect = new URL(location);
  const code = redirect.searchParams.get('code');
  const usid = redirect.searchParams.get('usid');
  if (!code || !usid) {
    throw new Error(`${operation} redirect contains no code or usid: ${location}`);
  }

  return { code, usid };
};

const exchangeAuthorizationCode = async (
  request: APIRequestContext,
  redirect: AuthorizationRedirect,
  verifier: string,
): Promise<TokenResponse> => {
  const response = await request.post(slasUrl('oauth2/token'), {
    form: {
      channel_id: env.SFCC_SITE_ID,
      client_id: env.SFCC_CLIENT_ID,
      code: redirect.code,
      code_verifier: verifier,
      grant_type: 'authorization_code_pkce',
      redirect_uri: redirectUri,
      usid: redirect.usid,
    },
  });
  if (response.status() !== 200) {
    throw await responseError('SLAS token exchange', response);
  }

  const payload: unknown = await response.json();
  if (!isTokenResponse(payload)) {
    throw new Error('SLAS token exchange returned an invalid token response');
  }

  return payload;
};

const authorizationParams = (challenge: string): Readonly<Record<string, string>> => ({
  channel_id: env.SFCC_SITE_ID,
  client_id: env.SFCC_CLIENT_ID,
  code_challenge: challenge,
  redirect_uri: redirectUri,
  response_type: 'code',
});

export const getGuestToken = async (request: APIRequestContext): Promise<TokenResponse> => {
  const pkce = createPkcePair();
  const response = await request.get(slasUrl('oauth2/authorize'), {
    maxRedirects: 0,
    params: { ...authorizationParams(pkce.challenge), hint: 'guest' },
  });
  const redirect = await parseAuthorizationRedirect('SLAS guest authorization', response);
  return exchangeAuthorizationCode(request, redirect, pkce.verifier);
};

export const loginRegisteredShopper = async (
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<RegisteredLoginResult> => {
  const pkce = createPkcePair();
  const credentials = Buffer.from(`${email}:${password}`).toString('base64');
  const response = await request.post(slasUrl('oauth2/login'), {
    form: authorizationParams(pkce.challenge),
    headers: { Authorization: `Basic ${credentials}` },
    maxRedirects: 0,
  });
  if (response.status() === 401) {
    return { status: response.status() };
  }

  const redirect = await parseAuthorizationRedirect('SLAS registered login', response);
  const token = await exchangeAuthorizationCode(request, redirect, pkce.verifier);
  return {
    accessToken: token.access_token,
    customerId: token.customer_id,
    status: response.status(),
  };
};

export const requireAuthenticatedShopper = (
  result: RegisteredLoginResult,
): AuthenticatedShopper => {
  if (!result.accessToken || !result.customerId) {
    throw new Error(`SLAS registered login was not authenticated: HTTP ${result.status}`);
  }

  return { accessToken: result.accessToken, customerId: result.customerId };
};
