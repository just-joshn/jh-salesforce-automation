export interface Env {
  readonly E2E_BASE_URL: string;
  readonly E2E_SITE_ALIAS: string;
  readonly E2E_LOCALE: string;

  readonly SFCC_SHORT_CODE: string;
  readonly SFCC_ORG_ID: string;
  readonly SFCC_CLIENT_ID: string;
  readonly SFCC_SITE_ID: string;

  readonly EINSTEIN_HOST: string;
  readonly EINSTEIN_ID: string;
  readonly EINSTEIN_SITE_ID: string;
  readonly DATACLOUD_APP_SOURCE_ID: string;
  readonly DATACLOUD_TENANT_ID: string;

  readonly E2E_ACCOUNT_EMAIL: string | undefined;
  readonly E2E_ACCOUNT_PASSWORD: string | undefined;

  readonly E2E_OMS_TRACKING_ORDER_NO: string | undefined;
  readonly E2E_OMS_CANCEL_ORDER_NO: string | undefined;
  readonly E2E_OMS_RETURN_ORDER_NO: string | undefined;
}

const withDefault = (value: string | undefined, fallback: string): string => value ?? fallback;

const optional = (value: string | undefined): string | undefined =>
  value && value.length > 0 ? value : undefined;

export const env: Env = Object.freeze({
  E2E_BASE_URL: withDefault(process.env.E2E_BASE_URL, 'https://pwa-kit.mobify-storefront.com'),
  E2E_SITE_ALIAS: withDefault(process.env.E2E_SITE_ALIAS, 'global'),
  E2E_LOCALE: withDefault(process.env.E2E_LOCALE, 'en-US'),

  SFCC_SHORT_CODE: withDefault(process.env.SFCC_SHORT_CODE, 'kv7kzm78'),
  SFCC_ORG_ID: withDefault(process.env.SFCC_ORG_ID, 'f_ecom_zzrf_001'),
  SFCC_CLIENT_ID: withDefault(process.env.SFCC_CLIENT_ID, 'c9c45bfd-0ed3-4aa2-9971-40f88962b836'),
  SFCC_SITE_ID: withDefault(process.env.SFCC_SITE_ID, 'RefArchGlobal'),

  EINSTEIN_HOST: withDefault(process.env.EINSTEIN_HOST, 'https://api.cquotient.com'),
  EINSTEIN_ID: withDefault(process.env.EINSTEIN_ID, '1ea06c6e-c936-4324-bcf0-fada93f83bb1'),
  EINSTEIN_SITE_ID: withDefault(process.env.EINSTEIN_SITE_ID, 'aaij-MobileFirst'),
  DATACLOUD_APP_SOURCE_ID: withDefault(
    process.env.DATACLOUD_APP_SOURCE_ID,
    '7ae070a6-f4ec-4def-a383-d9cacc3f20a1',
  ),
  DATACLOUD_TENANT_ID: withDefault(
    process.env.DATACLOUD_TENANT_ID,
    'g82wgnrvm-ywk9dggrrw8mtggy.pc-rnd',
  ),

  E2E_ACCOUNT_EMAIL: optional(process.env.E2E_ACCOUNT_EMAIL),
  E2E_ACCOUNT_PASSWORD: optional(process.env.E2E_ACCOUNT_PASSWORD),

  E2E_OMS_TRACKING_ORDER_NO: optional(process.env.E2E_OMS_TRACKING_ORDER_NO),
  E2E_OMS_CANCEL_ORDER_NO: optional(process.env.E2E_OMS_CANCEL_ORDER_NO),
  E2E_OMS_RETURN_ORDER_NO: optional(process.env.E2E_OMS_RETURN_ORDER_NO),
});

const stripLeadingSlash = (path: string): string => path.replace(/^\/+/, '');

export const buildPath = (path: string): string => {
  const trimmed = stripLeadingSlash(path);
  return `/${env.E2E_SITE_ALIAS}/${env.E2E_LOCALE}${trimmed ? `/${trimmed}` : ''}`;
};
