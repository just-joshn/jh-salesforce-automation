import type { APIRequestContext } from '@playwright/test';

import { env } from '../../config/env';
import type {
  AppConfiguration,
  CommerceAgentConfiguration,
  SocialLoginConfiguration,
} from './app-config';
import { bearer, shopperApiUrl, withSite } from './scapi';
import type { Configuration, SiteConfiguration } from './scapi-types';
import { getGuestToken } from './slas';

export interface GateVerdict {
  readonly met: boolean;
  readonly missing: string[];
}

export interface PasswordlessLoginGate extends GateVerdict {
  readonly mode: string | undefined;
  readonly landingPath: string | undefined;
}

export interface SocialLoginGate extends GateVerdict {
  readonly idps: readonly string[];
  readonly redirectURI: string | undefined;
}

export interface SfraRouteProbe {
  readonly status: number;
  readonly url: string;
}

interface Requirement {
  readonly key: string;
  readonly isMet: boolean;
}

interface ShopperConfigurationsResponse {
  readonly configurations: readonly Configuration[];
}

const isNonEmptyString = (value: string | undefined): boolean =>
  value !== undefined && value.length > 0;

const verdictFrom = (requirements: readonly Requirement[]): GateVerdict => {
  const missing = requirements.filter(({ isMet }) => !isMet).map(({ key }) => key);
  return { met: missing.length === 0, missing };
};

const requirementsFor = (
  value: CommerceAgentConfiguration | undefined,
  keys: readonly (keyof CommerceAgentConfiguration)[],
): Requirement[] =>
  keys.map((key) => ({ key: `app.commerceAgent.${key}`, isMet: isNonEmptyString(value?.[key]) }));

const hasEither = (first: string | undefined, second: string | undefined): boolean =>
  isNonEmptyString(first) || isNonEmptyString(second);

const isAvailableSfraRoute = (status: number): boolean => status >= 200 && status < 400;

const isConfiguration = (value: unknown): value is Configuration =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string' &&
  'value' in value;

const isSiteConfiguration = (value: unknown): value is SiteConfiguration =>
  typeof value === 'object' &&
  value !== null &&
  'configurations' in value &&
  Array.isArray(value.configurations) &&
  value.configurations.every(isConfiguration);

const readShopperConfigurations = async (
  request: APIRequestContext,
): Promise<ShopperConfigurationsResponse> => {
  const token = await getGuestToken(request);
  const response = await request.get(
    shopperApiUrl('configuration/shopper-configurations', 'configurations'),
    {
      headers: bearer(token.access_token),
      params: withSite(),
    },
  );
  if (!response.ok()) {
    throw new Error(`Shopper Configurations request failed with HTTP ${response.status()}`);
  }

  const payload: unknown = await response.json();
  if (!isSiteConfiguration(payload)) {
    throw new Error('Shopper Configurations response does not match SiteConfiguration');
  }

  return payload;
};

const salesforcePaymentsAllowed = async (request: APIRequestContext): Promise<boolean> => {
  const { configurations } = await readShopperConfigurations(request);
  const setting = configurations.find(({ id }) => id === 'SalesforcePaymentsAllowed');
  return setting?.value === true || setting?.value === 'true';
};

export const formatGateSkipReason = (verdict: GateVerdict): string =>
  verdict.met
    ? 'Journey gate met.'
    : `Journey skipped: unmet settings: ${verdict.missing.join(', ')}.`;

// Payment configuration, provider metadata, and the server-side allowance are the full CUJ 2/3
// prerequisites; basket, shipping, and payment behavior are exercised by their journeys.
export const evaluateSalesforcePaymentsGate = async (
  app: AppConfiguration,
  request: APIRequestContext,
): Promise<GateVerdict> => {
  const serverAllowed = await salesforcePaymentsAllowed(request);
  return verdictFrom([
    { key: 'app.sfPayments.enabled', isMet: app.sfPayments?.enabled === true },
    { key: 'app.sfPayments.sdkUrl', isMet: isNonEmptyString(app.sfPayments?.sdkUrl) },
    { key: 'app.sfPayments.metadataUrl', isMet: isNonEmptyString(app.sfPayments?.metadataUrl) },
    { key: 'SalesforcePaymentsAllowed', isMet: serverAllowed },
  ]);
};

// No express-checkout key ships in #mobify-data for this storefront; it depends on Salesforce Payments.
export const evaluateExpressCheckoutGate = async (
  app: AppConfiguration,
  request: APIRequestContext,
): Promise<GateVerdict> => evaluateSalesforcePaymentsGate(app, request);

export const evaluateOneClickCheckoutGate = (app: AppConfiguration): GateVerdict =>
  verdictFrom([
    { key: 'app.oneClickCheckout.enabled', isMet: app.oneClickCheckout?.enabled === true },
    { key: 'E2E_ONE_CLICK_OTP', isMet: isNonEmptyString(env.E2E_ONE_CLICK_OTP) },
  ]);

export const evaluateSfraRouteGate = (probes: readonly SfraRouteProbe[]): GateVerdict =>
  verdictFrom(
    probes.map(({ status, url }) => ({
      key: `SFRA route ${url} (HTTP ${status})`,
      isMet: isAvailableSfraRoute(status),
    })),
  );

const miawRequirements = (agent: CommerceAgentConfiguration | undefined): Requirement[] =>
  requirementsFor(agent, [
    'embeddedServiceName',
    'embeddedServiceEndpoint',
    'scriptSourceUrl',
    'scrt2Url',
    'salesforceOrgId',
    'commerceOrgId',
    'siteId',
    'askAgentOnSearch',
  ]);

const commerceClientRequirements = (
  agent: CommerceAgentConfiguration | undefined,
): Requirement[] => [
  ...requirementsFor(agent, ['scrt2Url', 'salesforceOrgId']),
  {
    key: 'app.commerceAgent.cc_esDeveloperName|embeddedServiceName',
    isMet: hasEither(agent?.cc_esDeveloperName, agent?.embeddedServiceName),
  },
  {
    key: 'app.commerceAgent.cc_cdnVersion|commerceClientScriptSourceUrl',
    isMet: hasEither(agent?.cc_cdnVersion, agent?.commerceClientScriptSourceUrl),
  },
];

const agentProviderRequirements = (agent: CommerceAgentConfiguration | undefined): Requirement[] =>
  agent?.provider === 'commerce-client'
    ? commerceClientRequirements(agent)
    : miawRequirements(agent);

export const evaluateCommerceAgentGate = (app: AppConfiguration): GateVerdict =>
  verdictFrom([
    { key: 'app.commerceAgent.enabled', isMet: app.commerceAgent?.enabled === 'true' },
    ...agentProviderRequirements(app.commerceAgent),
  ]);

export const evaluatePasswordlessLoginGate = (app: AppConfiguration): PasswordlessLoginGate => {
  const passwordless = app.login?.passwordless;
  return {
    ...verdictFrom([
      { key: 'app.login.passwordless.enabled', isMet: passwordless?.enabled === true },
    ]),
    mode: passwordless?.mode,
    landingPath: passwordless?.landingPath,
  };
};

const socialLoginVerdict = (
  social: SocialLoginConfiguration | undefined,
  idps: readonly string[],
): GateVerdict =>
  verdictFrom([
    { key: 'app.login.social.enabled', isMet: social?.enabled === true },
    { key: 'app.login.social.idps', isMet: idps.length > 0 },
  ]);

export const evaluateSocialLoginGate = (app: AppConfiguration): SocialLoginGate => {
  const social = app.login?.social;
  const idps = social?.idps ?? [];
  return { ...socialLoginVerdict(social, idps), idps, redirectURI: social?.redirectURI };
};

export const evaluatePasswordResetExternalCallbackGate = (app: AppConfiguration): GateVerdict => {
  const mode = app.login?.resetPassword?.mode;
  return verdictFrom([
    {
      key: `app.login.resetPassword.mode (observed ${JSON.stringify(mode)}; expected "callback")`,
      isMet: mode === 'callback',
    },
    {
      key: 'E2E_ACCOUNT_MANAGER_CLIENT_ID',
      isMet: isNonEmptyString(env.E2E_ACCOUNT_MANAGER_CLIENT_ID),
    },
    {
      key: 'E2E_ACCOUNT_MANAGER_CLIENT_SECRET',
      isMet: isNonEmptyString(env.E2E_ACCOUNT_MANAGER_CLIENT_SECRET),
    },
  ]);
};
