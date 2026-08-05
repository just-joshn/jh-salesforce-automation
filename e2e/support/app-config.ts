import type { APIRequestContext } from '@playwright/test';
import { env } from '../../config/env';
import { buildPath } from './site';

// The storefront's own shipped configuration, which is what decides whether the
// conditional checkout journeys exist on a given deployment at all. PWA Kit
// serializes it into every server-rendered page as `#mobify-data`, so reading it
// asks the app under test what it is configured to do rather than guessing from
// what happens to render.

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

export interface StorefrontAppConfig {
  oneClickCheckout?: OneClickCheckoutConfig;
  sfPayments?: SfPaymentsConfig;
  login?: LoginConfig;
}

interface MobifyData {
  __CONFIG__?: { app?: StorefrontAppConfig };
}

const mobifyData = /<script id="mobify-data"[^>]*>([\s\S]*?)<\/script>/;

/**
 * The app config the storefront under test is running with.
 *
 * A storefront that will not serve its own configuration is a store fault, not a
 * journey whose condition is unmet, so it is raised rather than folded into an
 * empty result: a broken shop must never read as "this journey does not apply
 * here".
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
