import { env } from '../../../config/env';
import type { OrderableVariant } from '../../../api/support/products';

export interface JourneyProduct {
  readonly name: string;
  readonly path: string;
}

export interface SocialProvider {
  readonly authorizationHost: string;
  readonly idp: string;
  readonly label: string;
}

const knownProviderLabels: Readonly<Record<string, string>> = Object.freeze({
  apple: 'apple Apple',
  google: 'google Google',
});

const titleCase = (value: string): string =>
  value.length === 0 ? value : `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

const providerLabel = (idp: string): string =>
  knownProviderLabels[idp] ?? `${idp} ${titleCase(idp)}`;

export const journeyProductFrom = ({ productName, variantId }: OrderableVariant): JourneyProduct =>
  Object.freeze({ name: productName, path: `/product/${variantId}` });

export const socialProviderFor = (idp: string): SocialProvider =>
  Object.freeze({
    authorizationHost: new URL(env.E2E_BASE_URL).hostname,
    idp,
    label: providerLabel(idp),
  });

export const firstSocialProvider = (idps: readonly string[]): SocialProvider => {
  const [idp] = idps;
  if (idp === undefined) {
    throw new Error('Social login gate met without an identity provider');
  }

  return socialProviderFor(idp);
};

export const matchesAuthorizationUrl = (url: URL, provider: SocialProvider): boolean =>
  url.hostname === provider.authorizationHost &&
  url.pathname.endsWith('/oauth2/authorize') &&
  url.searchParams.get('hint') === provider.idp;

export const callbackPath = (redirectURI: string | undefined): string => {
  if (redirectURI === undefined) {
    throw new Error('Social login callback redirectURI is not configured');
  }

  return redirectURI;
};

export const externalIdentityProviderSkipReason = (
  idps: readonly string[],
  redirectURI: string | undefined,
): string =>
  `Completing social login requires authenticating at an external identity provider this suite holds no credentials for (idps: ${JSON.stringify(idps)}, redirectURI: ${JSON.stringify(redirectURI)}).`;
