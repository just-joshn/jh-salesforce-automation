import { createHash, randomBytes } from 'node:crypto';
import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { basicAuth, callbackUri, env, slasPrivateUrl } from './env';
import type { TokenResponse } from './scapi-types';
import { parseJson } from './response';
import { tokenResponseSchema } from './schemas';

const passwordLoginForm = (challenge: string, usid?: string): Record<string, string> => {
  const form: Record<string, string> = {
    redirect_uri: callbackUri(),
    client_id: env.SFCC_PRIVATE_CLIENT_ID,
    code_challenge: challenge,
    channel_id: env.SFCC_SITE_ID,
  };
  if (usid) {
    form.usid = usid;
  }
  return form;
};

const loginRedirect = (location: string | undefined): { code: string; usid: string } => {
  const redirect = new URL(location ?? '');
  const code = redirect.searchParams.get('code');
  const usid = redirect.searchParams.get('usid');
  if (!code || !usid) {
    throw new Error(`SLAS login redirect missing code/usid: ${redirect.toString()}`);
  }
  return { code, usid };
};

export interface RegisteredLoginResult {
  readonly status: number;
  readonly token?: TokenResponse;
}

/**
 * The SLAS flows behind the auth UI — every call goes through the storefront's own
 * `/mobify/slas/private/...` proxy, exactly as the browser issues it, including the
 * placeholder secret the storefront's server swaps for the real one before forwarding.
 */
export class SlasClient {
  constructor(private readonly request: APIRequestContext) {}

  private get pkce(): { verifier: string; challenge: string } {
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
  }

  /**
   * A fresh anonymous session token. The storefront mints this same token server-side
   * during SSR (never as a client-visible request); this is the closest faithful
   * equivalent, using the exact client_credentials call the storefront's own SDK makes
   * on the same proxy when it needs to refresh one mid-session.
   */
  async guestToken(): Promise<TokenResponse> {
    const response = await this.request.post(slasPrivateUrl('oauth2/token'), {
      form: { grant_type: 'client_credentials', channel_id: env.SFCC_SITE_ID, dnt: 'true' },
      headers: this.privateBasic,
    });
    expect(response.status(), 'guest token via SLAS private proxy').toBe(200);
    return parseJson<TokenResponse>(response, tokenResponseSchema, 'guest token');
  }

  private get privateBasic(): Record<string, string> {
    return basicAuth(env.SFCC_PRIVATE_CLIENT_ID, env.SFCC_PRIVATE_CLIENT_SECRET_PLACEHOLDER);
  }

  /**
   * B2's "Sign In": the browser POSTs Basic(email:password) plus PKCE + the current
   * session's usid, follows the 303 to /callback?code=..., and exchanges the code for a
   * token. Passing the guest session's `usid` is what links the anonymous identity —
   * D2's basket merge depends on it.
   */
  async loginWithPassword(
    email: string,
    password: string,
    usid?: string,
  ): Promise<RegisteredLoginResult> {
    const { verifier, challenge } = this.pkce;
    const login = await this.request.post(slasPrivateUrl('oauth2/login'), {
      form: passwordLoginForm(challenge, usid),
      headers: basicAuth(email, password),
      maxRedirects: 0,
    });
    if (login.status() !== 303) {
      return { status: login.status() };
    }

    const { code, usid: tokenUsid } = loginRedirect(login.headers().location);

    const token = await this.request.post(slasPrivateUrl('oauth2/token'), {
      form: {
        client_id: env.SFCC_PRIVATE_CLIENT_ID,
        channel_id: env.SFCC_SITE_ID,
        code,
        code_verifier: verifier,
        grant_type: 'authorization_code_pkce',
        organizationId: env.SFCC_ORG_ID,
        redirect_uri: callbackUri(),
        usid: tokenUsid,
        dnt: 'true',
      },
      headers: this.privateBasic,
    });
    expect(token.status(), 'SLAS token exchange').toBe(200);
    return {
      status: login.status(),
      token: await parseJson<TokenResponse>(token, tokenResponseSchema, 'SLAS token exchange'),
    };
  }

  /**
   * B3: requesting the emailed one-time code. The browser POSTs the user_id in form
   * mode=email; the proxy holds the private client this call requires.
   */
  async requestPasswordlessCode(email: string, usid: string): Promise<APIResponse> {
    return this.request.post(slasPrivateUrl('oauth2/passwordless/login'), {
      form: {
        user_id: email,
        mode: 'email',
        locale: env.E2E_LOCALE,
        usid,
        channel_id: env.SFCC_SITE_ID,
      },
    });
  }

  /**
   * B3's verify step: the browser submits the configured-length code with a fresh
   * code_verifier and client_credentials. A wrong code answers 401 — the verifiable boundary of this
   * journey, since the real code lands in an inbox this suite cannot read.
   */
  async verifyPasswordlessCode(code: string): Promise<APIResponse> {
    const { verifier } = this.pkce;
    return this.request.post(slasPrivateUrl('oauth2/passwordless/token'), {
      form: {
        grant_type: 'client_credentials',
        hint: 'pwdless_login',
        pwdless_login_token: code,
        code_verifier: verifier,
        dnt: 'true',
      },
    });
  }

  /**
   * B4: the exact GET the Google/Apple buttons navigate to. The proxy answers 403 for
   * both IdPs before any IdP is reached — the documented live defect this journey
   * evidences.
   */
  async socialAuthorize(idp: 'google' | 'apple', usid: string): Promise<APIResponse> {
    return this.request.get(slasPrivateUrl('oauth2/authorize'), {
      params: {
        dnt: 'true',
        client_id: env.SFCC_PRIVATE_CLIENT_ID,
        channel_id: env.SFCC_SITE_ID,
        hint: idp,
        redirect_uri: callbackUri('/social-callback'),
        response_type: 'code',
        usid,
      },
      maxRedirects: 0,
    });
  }

  /**
   * B5: the forgot-password request. Requires PKCE like every SLAS auth call. On this
   * demo every freshly-registered account is unverified (there is no inbox to verify
   * with), and SLAS refuses to email a reset link for an unverified address — the live
   * contract the UI masks with its anti-enumeration confirmation copy.
   */
  async requestPasswordReset(email: string): Promise<APIResponse> {
    const { challenge } = this.pkce;
    return this.request.post(slasPrivateUrl('oauth2/password/reset'), {
      form: {
        user_id: email,
        client_id: env.SFCC_PRIVATE_CLIENT_ID,
        channel_id: env.SFCC_SITE_ID,
        locale: env.E2E_LOCALE,
        mode: 'email',
        code_challenge: challenge,
      },
      headers: this.privateBasic,
    });
  }
}
