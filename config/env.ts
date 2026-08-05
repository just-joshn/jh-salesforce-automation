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

  /**
   * Orders the account above owns, already in the state each OMS journey needs.
   * Seeded rather than placed by the test because OMS ingestion is not
   * retroactive and cannot advance an order on demand. Empty = journey skips.
   */
  oms: {
    /** Order with at least one OMS shipment carrying a carrier tracking URL. */
    trackingOrderNo: process.env.E2E_OMS_TRACKING_ORDER_NO ?? '',
    /** Order still cancellable in full, i.e. nothing allocated yet. */
    cancelOrderNo: process.env.E2E_OMS_CANCEL_ORDER_NO ?? '',
    /** Order with at least one line holding a returnable quantity. */
    returnOrderNo: process.env.E2E_OMS_RETURN_ORDER_NO ?? '',
  },

  /** Einstein recommendations (public demo values, safe to commit). */
  einstein: {
    host: process.env.EINSTEIN_HOST ?? 'https://api.cquotient.com',
    /** Sent as x-cq-client-id, the same way the storefront sends it. */
    clientId: process.env.EINSTEIN_ID ?? '1ea06c6e-c936-4324-bcf0-fada93f83bb1',
    /** Einstein's own site id, which is not the shop's siteId. */
    siteId: process.env.EINSTEIN_SITE_ID ?? 'aaij-MobileFirst',
  },

  /** Data Cloud web events the storefront sends alongside Einstein. */
  dataCloud: {
    appSourceId: process.env.DATACLOUD_APP_SOURCE_ID ?? '7ae070a6-f4ec-4def-a383-d9cacc3f20a1',
    tenantId: process.env.DATACLOUD_TENANT_ID ?? 'g82wgnrvm-ywk9dggrrw8mtggy.pc-rnd',
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
