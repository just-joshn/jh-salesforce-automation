import type { APIRequestContext } from '@playwright/test';
import { buildPath, env } from '../../config/env';

// The storefront's own shipped configuration. It decides whether the conditional
// checkout journeys exist on a given deployment.
//
// PWA Kit serializes it into every server-rendered page as `#mobify-data`.
// Reading it asks the app under test what it is configured to do, instead of
// guessing from what happens to render.

export interface OneClickCheckoutConfig {
  enabled?: boolean;
}

export interface SfPaymentsConfig {
  enabled?: boolean;
  sdkUrl?: string;
  metadataUrl?: string;
}

export interface PasswordlessConfig {
  enabled?: boolean;
  /** How the identity token reaches the shopper, e.g. `email` or `sms`. */
  mode?: string;
  landingPath?: string;
  callbackURI?: string;
}

export interface LoginConfig {
  /** Digits in the passwordless identity token the shopper types back. */
  tokenLength?: number;
  passwordless?: PasswordlessConfig;
}

/**
 * The Commerce Agent settings the storefront ships. They decide whether the
 * shopper-assistance journey exists on a deployment.
 *
 * Every flag is a string, not a boolean: the template parses them all out of one
 * environment variable. So `'false'` is a value the agent reads, and `''` is a
 * missing one.
 */
export interface CommerceAgentConfig {
  enabled?: string;
  askAgentOnSearch?: string;
  /** `miaw` (Embedded Messaging, the default) or `commerce-client`. */
  provider?: string;
  embeddedServiceName?: string;
  embeddedServiceEndpoint?: string;
  scriptSourceUrl?: string;
  scrt2Url?: string;
  salesforceOrgId?: string;
  commerceOrgId?: string;
  /** The agent platform's own site id, which is not the shop's siteId. */
  siteId?: string;
  enableConversationContext?: string;
  conversationContext?: unknown[];
  enableAgentFromHeader?: string;
  enableAgentFromFloatingButton?: string;
  enableAgentFromSearchSuggestions?: string;
  /** Bundle version the Commerce Client provider builds its CDN URL from. */
  cc_cdnVersion?: string;
  /** A whole Commerce Client bundle URL, used instead of `cc_cdnVersion`. */
  commerceClientScriptSourceUrl?: string;
  cc_esDeveloperName?: string;
}

export interface EinsteinApiConfig {
  host?: string;
  einsteinId?: string;
  /** Einstein's own site id, which is not the shop's siteId. */
  siteId?: string;
}

export interface DataCloudApiConfig {
  appSourceId?: string;
  tenantId?: string;
}

export interface StorefrontAppConfig {
  oneClickCheckout?: OneClickCheckoutConfig;
  sfPayments?: SfPaymentsConfig;
  login?: LoginConfig;
  commerceAgent?: CommerceAgentConfig;
  einsteinAPI?: EinsteinApiConfig;
  dataCloudAPI?: DataCloudApiConfig;
}

interface MobifyData {
  __CONFIG__?: { app?: StorefrontAppConfig };
}

const mobifyData = /<script id="mobify-data"[^>]*>([\s\S]*?)<\/script>/;

/**
 * The `#mobify-data` JSON the page carries.
 *
 * A storefront that will not serve its own configuration is a store fault, not a
 * journey whose condition is unmet. So this throws instead of returning nothing:
 * a broken shop must never read as "this journey does not apply here".
 */
const embeddedJson = (body: string, url: string): string => {
  const embedded = mobifyData.exec(body)?.[1];
  if (embedded === undefined) {
    throw new Error(
      `${url} carried no #mobify-data configuration; the storefront under test is ` +
        'not a server-rendered PWA Kit app',
    );
  }
  return embedded;
};

const appConfigOf = (body: string, url: string): StorefrontAppConfig => {
  const app = (JSON.parse(embeddedJson(body, url)) as MobifyData).__CONFIG__?.app;
  if (app === undefined) {
    throw new Error(`${url} carried #mobify-data without an app configuration`);
  }
  return app;
};

export async function readStorefrontAppConfig(
  request: APIRequestContext,
): Promise<StorefrontAppConfig> {
  const url = `${env.baseURL}${buildPath('/')}`;
  const response = await request.get(url);
  if (!response.ok()) {
    throw new Error(
      `the storefront did not serve ${url} (${response.status()}); its feature ` +
        'configuration could not be established',
    );
  }
  return appConfigOf(await response.text(), url);
}
