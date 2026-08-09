import type { APIRequestContext, APIResponse } from '@playwright/test';

import { buildPath, env } from '../../config/env';

export interface OneClickCheckoutConfiguration {
  readonly enabled?: boolean;
}

export interface SalesforcePaymentsConfiguration {
  readonly enabled?: boolean;
  readonly sdkUrl?: string;
  readonly metadataUrl?: string;
}

export interface PasswordlessLoginConfiguration {
  readonly enabled?: boolean;
  readonly mode?: string;
  readonly landingPath?: string;
  readonly callbackURI?: string;
}

export interface SocialLoginConfiguration {
  readonly enabled?: boolean;
  readonly idps?: readonly string[];
  readonly redirectURI?: string;
}

export interface ResetPasswordConfiguration {
  readonly mode?: string;
  readonly landingPath?: string;
}

export interface LoginConfiguration {
  readonly passwordless?: PasswordlessLoginConfiguration;
  readonly tokenLength?: number;
  readonly social?: SocialLoginConfiguration;
  readonly resetPassword?: ResetPasswordConfiguration;
}

export interface CommerceAgentConfiguration {
  readonly enabled?: string;
  readonly provider?: string;
  readonly embeddedServiceName?: string;
  readonly embeddedServiceEndpoint?: string;
  readonly scriptSourceUrl?: string;
  readonly scrt2Url?: string;
  readonly salesforceOrgId?: string;
  readonly commerceOrgId?: string;
  readonly siteId?: string;
  readonly askAgentOnSearch?: string;
  readonly cc_esDeveloperName?: string;
  readonly cc_cdnVersion?: string;
  readonly commerceClientScriptSourceUrl?: string;
}

export interface AppConfiguration {
  readonly oneClickCheckout?: OneClickCheckoutConfiguration;
  readonly sfPayments?: SalesforcePaymentsConfiguration;
  readonly login?: LoginConfiguration;
  readonly commerceAgent?: CommerceAgentConfiguration;
  readonly multishipEnabled?: boolean;
  readonly storeLocatorEnabled?: boolean;
}

type ConfigRecord = Readonly<Record<string, unknown>>;

let cachedConfiguration: Promise<AppConfiguration> | undefined;

const isRecord = (value: unknown): value is ConfigRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const recordAt = (record: ConfigRecord, key: string): ConfigRecord | undefined => {
  const value = record[key];
  return isRecord(value) ? value : undefined;
};

const booleanAt = (record: ConfigRecord, key: string): boolean | undefined => {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
};

const stringAt = (record: ConfigRecord, key: string): string | undefined => {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
};

const numberAt = (record: ConfigRecord, key: string): number | undefined => {
  const value = record[key];
  return typeof value === 'number' ? value : undefined;
};

const stringArrayAt = (record: ConfigRecord, key: string): readonly string[] | undefined => {
  const value = record[key];
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : undefined;
};

const parseJson = (serializedConfig: string): unknown => JSON.parse(serializedConfig);

const appConfigurationAt = (value: unknown): ConfigRecord | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const config = recordAt(value, '__CONFIG__');
  return config ? recordAt(config, 'app') : undefined;
};

const extractMobifyData = (html: string): string => {
  const match = /<script\b[^>]*\bid=(['"])mobify-data\1[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!match?.[2]) {
    throw new Error('Storefront response contains no <script id="mobify-data"> element');
  }

  return match[2];
};

const parseAppRecord = (serializedConfig: string): ConfigRecord => {
  let parsed: unknown;
  try {
    parsed = parseJson(serializedConfig);
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Storefront mobify-data JSON could not be parsed: ${reason}`);
  }

  const configuration = appConfigurationAt(parsed);
  if (!configuration) {
    throw new Error('Storefront mobify-data JSON contains no __CONFIG__.app configuration');
  }

  return configuration;
};

const toOneClickCheckout = (app: ConfigRecord): OneClickCheckoutConfiguration | undefined => {
  const configuration = recordAt(app, 'oneClickCheckout');
  return configuration && { enabled: booleanAt(configuration, 'enabled') };
};

const toSalesforcePayments = (app: ConfigRecord): SalesforcePaymentsConfiguration | undefined => {
  const configuration = recordAt(app, 'sfPayments');
  return (
    configuration && {
      enabled: booleanAt(configuration, 'enabled'),
      sdkUrl: stringAt(configuration, 'sdkUrl'),
      metadataUrl: stringAt(configuration, 'metadataUrl'),
    }
  );
};

const toPasswordless = (login: ConfigRecord): PasswordlessLoginConfiguration | undefined => {
  const passwordless = recordAt(login, 'passwordless');
  return (
    passwordless && {
      enabled: booleanAt(passwordless, 'enabled'),
      mode: stringAt(passwordless, 'mode'),
      landingPath: stringAt(passwordless, 'landingPath'),
      callbackURI: stringAt(passwordless, 'callbackURI'),
    }
  );
};

const toSocialLogin = (login: ConfigRecord): SocialLoginConfiguration | undefined => {
  const social = recordAt(login, 'social');
  return (
    social && {
      enabled: booleanAt(social, 'enabled'),
      idps: stringArrayAt(social, 'idps'),
      redirectURI: stringAt(social, 'redirectURI'),
    }
  );
};

const toResetPassword = (login: ConfigRecord): ResetPasswordConfiguration | undefined => {
  const resetPassword = recordAt(login, 'resetPassword');
  return (
    resetPassword && {
      mode: stringAt(resetPassword, 'mode'),
      landingPath: stringAt(resetPassword, 'landingPath'),
    }
  );
};

const toLogin = (app: ConfigRecord): LoginConfiguration | undefined => {
  const login = recordAt(app, 'login');
  return (
    login && {
      passwordless: toPasswordless(login),
      tokenLength: numberAt(login, 'tokenLength'),
      social: toSocialLogin(login),
      resetPassword: toResetPassword(login),
    }
  );
};

const toCommerceAgent = (app: ConfigRecord): CommerceAgentConfiguration | undefined => {
  const configuration = recordAt(app, 'commerceAgent');
  if (!configuration) {
    return undefined;
  }

  return {
    enabled: stringAt(configuration, 'enabled'),
    provider: stringAt(configuration, 'provider'),
    embeddedServiceName: stringAt(configuration, 'embeddedServiceName'),
    embeddedServiceEndpoint: stringAt(configuration, 'embeddedServiceEndpoint'),
    scriptSourceUrl: stringAt(configuration, 'scriptSourceUrl'),
    scrt2Url: stringAt(configuration, 'scrt2Url'),
    salesforceOrgId: stringAt(configuration, 'salesforceOrgId'),
    commerceOrgId: stringAt(configuration, 'commerceOrgId'),
    siteId: stringAt(configuration, 'siteId'),
    askAgentOnSearch: stringAt(configuration, 'askAgentOnSearch'),
    cc_esDeveloperName: stringAt(configuration, 'cc_esDeveloperName'),
    cc_cdnVersion: stringAt(configuration, 'cc_cdnVersion'),
    commerceClientScriptSourceUrl: stringAt(configuration, 'commerceClientScriptSourceUrl'),
  };
};

const toAppConfiguration = (app: ConfigRecord): AppConfiguration => ({
  oneClickCheckout: toOneClickCheckout(app),
  sfPayments: toSalesforcePayments(app),
  login: toLogin(app),
  commerceAgent: toCommerceAgent(app),
  multishipEnabled: booleanAt(app, 'multishipEnabled'),
  storeLocatorEnabled: booleanAt(app, 'storeLocatorEnabled'),
});

const requireSuccessfulResponse = (response: APIResponse, url: string): void => {
  if (!response.ok()) {
    throw new Error(
      `Storefront configuration page request failed: ${url} returned HTTP ${response.status()}`,
    );
  }
};

const fetchAppConfiguration = async (request: APIRequestContext): Promise<AppConfiguration> => {
  const url = new URL(buildPath('/'), env.E2E_BASE_URL).toString();
  const response = await request.get(url);
  requireSuccessfulResponse(response, url);
  const html = await response.text();
  return toAppConfiguration(parseAppRecord(extractMobifyData(html)));
};

export const readAppConfiguration = (request: APIRequestContext): Promise<AppConfiguration> => {
  cachedConfiguration ??= fetchAppConfiguration(request);
  return cachedConfiguration;
};
