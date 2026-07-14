import type { APIRequestContext } from '@playwright/test';
import { createHash, randomBytes } from 'crypto';
import { env, scapiBaseUrl } from '../../config/env';

// Sign-in helpers for SLAS, Salesforce's shopper login API.
// The demo's login client is public (it has no secret), so tests can run the same two-step
// PKCE flow the storefront uses: ask for a one-time code, then trade it for an access token.

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

// Read the one-time code and usid out of a SLAS redirect's Location header. Guest and
// registered login both use this; returns null when either value is missing.
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

  // Step 1: ask for the one-time code. It arrives in a redirect's Location header, not the
  // body, so maxRedirects: 0 keeps the redirect unfollowed and readable.
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

// Return the token and customer id from a login, or fail the test with a clear message.
// Every signed-in spec needs this "did login really work?" check, so it lives here once.
export function requireSession(
  login: RegisteredLogin,
  who = 'the shopper',
): { accessToken: string; customerId: string } {
  if (!login.accessToken || !login.customerId) {
    throw new Error(`expected an authenticated session for ${who}`);
  }
  return { accessToken: login.accessToken, customerId: login.customerId };
}

// Sign in a registered shopper with email and password, the same way the storefront does.
// Credentials go to the login endpoint using Basic auth. Success is a 303 redirect carrying
// the one-time code (a wrong password gets 401); the code is then traded for an access token.
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
