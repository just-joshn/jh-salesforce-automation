
import { resolveTarget, storefrontPath, storefrontUrl } from '../../support/targets';

const target = resolveTarget();

export const env = {
  E2E_TARGET: target.name,
  E2E_BASE_URL: target.baseURL,
  E2E_SITE_ALIAS: target.siteAlias,
  E2E_LOCALE: target.locale,
  E2E_CURRENCY: target.currency,
  SFCC_SHORT_CODE: target.shortCode,
  SFCC_ORG_ID: target.orgId,
  SFCC_SITE_ID: target.siteId,
  SFCC_PUBLIC_CLIENT_ID: target.publicClientId,
  SFCC_PRIVATE_CLIENT_ID: target.privateClientId,
  SFCC_PRIVATE_CLIENT_SECRET_PLACEHOLDER: '_PLACEHOLDER_PROXY-PWA_KIT_SLAS_CLIENT_SECRET',
} as const;

export const buildPath = (path = ''): string => storefrontPath(target, path);

export const storefrontRequestUrl = (path = ''): string => storefrontUrl(target, path);

const organizationPath = (resourcePath: string): string =>
  `organizations/${env.SFCC_ORG_ID}/${resourcePath.replace(/^\/+/, '')}`;

export const proxyApiUrl = (apiFamily: string, resourcePath: string): string =>
  `${env.E2E_BASE_URL}/mobify/proxy/api/${apiFamily}/${organizationPath(resourcePath)}`;

export const slasPrivateUrl = (resourcePath: string): string =>
  `${env.E2E_BASE_URL}/mobify/slas/private/shopper/auth/v1/${organizationPath(resourcePath)}`;

export const slasPublicUrl = (resourcePath: string): string =>
  `https://${env.SFCC_SHORT_CODE}.api.commercecloud.salesforce.com/shopper/auth/v1/${organizationPath(resourcePath)}`;

export const withSite = (params: Record<string, string> = {}): Record<string, string> => ({
  ...params,
  siteId: env.SFCC_SITE_ID,
});

export const withLocale = (params: Record<string, string> = {}): Record<string, string> => ({
  ...params,
  siteId: env.SFCC_SITE_ID,
  locale: env.E2E_LOCALE,
});

export const bearer = (accessToken: string): Record<string, string> => ({
  Authorization: `Bearer ${accessToken}`,
});

export const basicAuth = (user: string, pass: string): Record<string, string> => ({
  Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
});

export const callbackUri = (path = '/callback'): string =>
  new URL(path, env.E2E_BASE_URL).toString();
