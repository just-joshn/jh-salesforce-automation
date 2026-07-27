import type { APIRequestContext } from '@playwright/test';
import { createHash, randomBytes } from 'crypto';
import { env, scapiBaseUrl } from '../../config/env';

// Login helpers (SLAS = shop login API).
// Demo login is public: get a one-time code, trade it for a token.

export interface GuestToken {
  accessToken: string;
  usid: string;
  customerId: string;
  expiresIn: number;
}

interface TokenResponse {
  access_token: string;
  usid: string;
  customer_id: string;
  expires_in: number;
}

function base64url(input: Buffer): string {
  return input.toString('base64url');
}

// Pull one-time code + usid from redirect URL. Null if missing.
function authCodeFromRedirect(location: string | undefined): { code: string; usid: string } | null {
  if (!location) return null;
  const params = new URL(location).searchParams;
  const code = params.get('code');
  const usid = params.get('usid');
  if (!code || !usid) return null;
  return { code, usid };
}

export async function getGuestToken(request: APIRequestContext): Promise<GuestToken> {
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
  const redirectUri = `${env.baseURL}/callback`;
  const org = env.scapi.organizationId;
  const authorizeUrl = `${scapiBaseUrl()}/shopper/auth/v1/organizations/${org}/oauth2/authorize`;
  const tokenUrl = `${scapiBaseUrl()}/shopper/auth/v1/organizations/${org}/oauth2/token`;

  // Ask for one-time code (in redirect header; don't follow the redirect).
  const authorize = await request.get(authorizeUrl, {
    params: {
      client_id: env.scapi.clientId,
      code_challenge: codeChallenge,
      response_type: 'code',
      redirect_uri: redirectUri,
      hint: 'guest',
      channel_id: env.scapi.siteId,
    },
    maxRedirects: 0,
  });

  const location = authorize.headers().location;
  if (!location) {
    throw new Error(
      `SLAS authorize did not redirect (status ${authorize.status()}): ${await authorize.text()}`,
    );
  }
  const auth = authCodeFromRedirect(location);
  if (!auth) {
    throw new Error(`SLAS authorize redirect missing code/usid: ${location}`);
  }
  const { code, usid } = auth;

  const token = await request.post(tokenUrl, {
    form: {
      grant_type: 'authorization_code_pkce',
      code_verifier: codeVerifier,
      code,
      client_id: env.scapi.clientId,
      redirect_uri: redirectUri,
      channel_id: env.scapi.siteId,
      usid,
    },
  });
  if (!token.ok()) {
    throw new Error(`SLAS token exchange failed (${token.status()}): ${await token.text()}`);
  }

  const body = (await token.json()) as TokenResponse;
  return {
    accessToken: body.access_token,
    usid: body.usid,
    customerId: body.customer_id,
    expiresIn: body.expires_in,
  };
}

export interface RegisteredLogin {
  loginStatus: number;
  accessToken?: string;
  customerId?: string;
}

// Need a real login token, or fail with a clear error.
export function requireSession(
  login: RegisteredLogin,
  who = 'the shopper',
): { accessToken: string; customerId: string } {
  if (!login.accessToken || !login.customerId) {
    throw new Error(`expected an authenticated session for ${who}`);
  }
  return { accessToken: login.accessToken, customerId: login.customerId };
}

// Sign in with email + password. Good login → code → token. Bad password → 401.
export async function loginRegisteredShopper(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<RegisteredLogin> {
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
  const redirectUri = `${env.baseURL}/callback`;
  const org = env.scapi.organizationId;
  const loginUrl = `${scapiBaseUrl()}/shopper/auth/v1/organizations/${org}/oauth2/login`;
  const tokenUrl = `${scapiBaseUrl()}/shopper/auth/v1/organizations/${org}/oauth2/token`;
  const credentials = Buffer.from(`${email}:${password}`).toString('base64');

  const login = await request.post(loginUrl, {
    headers: {
      Authorization: `Basic ${credentials}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    form: {
      client_id: env.scapi.clientId,
      code_challenge: codeChallenge,
      response_type: 'code',
      redirect_uri: redirectUri,
      channel_id: env.scapi.siteId,
    },
    maxRedirects: 0,
  });
  if (login.status() !== 303) return { loginStatus: login.status() };

  const auth = authCodeFromRedirect(login.headers().location);
  if (!auth) return { loginStatus: login.status() };
  const { code, usid } = auth;

  const token = await request.post(tokenUrl, {
    form: {
      grant_type: 'authorization_code_pkce',
      code_verifier: codeVerifier,
      code,
      client_id: env.scapi.clientId,
      redirect_uri: redirectUri,
      channel_id: env.scapi.siteId,
      usid,
    },
  });
  if (!token.ok()) return { loginStatus: login.status() };
  const body = (await token.json()) as TokenResponse;
  return { loginStatus: 303, accessToken: body.access_token, customerId: body.customer_id };
}
