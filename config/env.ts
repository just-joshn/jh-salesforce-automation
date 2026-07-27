// Settings from the environment.
// Safe defaults = public demo shop. Password only from .env or CI secrets.

export const env = {
  /** Shop website URL. */
  baseURL: process.env.E2E_BASE_URL ?? 'https://pwa-kit.mobify-storefront.com',

  /** Path prefix like /global/en-US. */
  siteAlias: process.env.E2E_SITE_ALIAS ?? 'global',
  locale: process.env.E2E_LOCALE ?? 'en-US',

  /** Shop API settings (public, safe to commit). */
  scapi: {
    shortCode: process.env.SFCC_SHORT_CODE ?? 'kv7kzm78',
    organizationId: process.env.SFCC_ORG_ID ?? 'f_ecom_zzrf_001',
    clientId: process.env.SFCC_CLIENT_ID ?? 'c9c45bfd-0ed3-4aa2-9971-40f88962b836',
    siteId: process.env.SFCC_SITE_ID ?? 'RefArchGlobal',
  },

  /** Login for signed-in tests. Empty = guest only. */
  account: {
    email: process.env.E2E_ACCOUNT_EMAIL ?? '',
    password: process.env.E2E_ACCOUNT_PASSWORD ?? '',
  },
} as const;

/** Shop API host (not the website host). */
export function scapiBaseUrl(): string {
  return `https://${env.scapi.shortCode}.api.commercecloud.salesforce.com`;
}

/** True if we have a test login. */
export function hasAccountCredentials(): boolean {
  return env.account.email.length > 0 && env.account.password.length > 0;
}
