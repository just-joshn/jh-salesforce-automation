// Central place for env-driven config.
//
// Non-secret defaults point at the public demo store, so guest browsing and public SCAPI
// calls run without a .env file. Secrets (the shopper password) have no default; they come
// from .env locally or the CI secret store.

export const env = {
  /** Storefront URL. buildPath() prepends the site/locale prefix (see support/site.ts). */
  baseURL: process.env.E2E_BASE_URL ?? 'https://pwa-kit.mobify-storefront.com',

  /** Site + locale that prefix every path, e.g. /global/en-US. */
  siteAlias: process.env.E2E_SITE_ALIAS ?? 'global',
  locale: process.env.E2E_LOCALE ?? 'en-US',

  /** SCAPI connection values, all public (safe to commit). */
  scapi: {
    shortCode: process.env.SFCC_SHORT_CODE ?? 'kv7kzm78',
    organizationId: process.env.SFCC_ORG_ID ?? 'f_ecom_zzrf_001',
    clientId: process.env.SFCC_CLIENT_ID ?? 'c9c45bfd-0ed3-4aa2-9971-40f88962b836',
    siteId: process.env.SFCC_SITE_ID ?? 'RefArchGlobal',
  },

  /** Registered shopper for logged-in tests. Blank runs guest-only. */
  account: {
    email: process.env.E2E_ACCOUNT_EMAIL ?? '',
    password: process.env.E2E_ACCOUNT_PASSWORD ?? '',
  },
} as const;

/** SCAPI runs on a different host from the storefront. */
export function scapiBaseUrl(): string {
  return `https://${env.scapi.shortCode}.api.commercecloud.salesforce.com`;
}

/** Lets logged-in-only tests skip themselves when no account is configured. */
export function hasAccountCredentials(): boolean {
  return env.account.email.length > 0 && env.account.password.length > 0;
}
