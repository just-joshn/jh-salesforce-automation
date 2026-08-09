import { createHash, randomBytes } from 'node:crypto';

import { env } from '../../../config/env';

export type SocialAuthorizationRequest = Readonly<Record<string, string>> & {
  readonly channel_id: string;
  readonly client_id: string;
  readonly code_challenge: string;
  readonly hint: string;
  readonly redirect_uri: string;
  readonly response_type: string;
  readonly usid: string;
};

export const expected = Object.freeze({ authorizationStatus: 303 });

export const createSocialAuthorizationRequest = (
  provider: string,
  usid: string,
): SocialAuthorizationRequest => {
  const verifier = randomBytes(32).toString('base64url');
  return {
    channel_id: env.SFCC_SITE_ID,
    client_id: env.SFCC_CLIENT_ID,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    hint: provider,
    redirect_uri: new URL('/callback', env.E2E_BASE_URL).toString(),
    response_type: 'code',
    usid,
  };
};

export const externalIdpSkipReason = (
  idps: readonly string[],
  redirectURI: string | undefined,
): string =>
  `Skipped: completing social login requires external IdP credentials and callback state (idps: ${idps.join(', ')}, redirectURI: ${String(redirectURI)}).`;
