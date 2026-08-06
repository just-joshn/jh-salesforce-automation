import type { APIRequestContext, Request } from '@playwright/test';
import { env } from '../../../config/env';
import type { CommerceAgentConfig } from '../../support/app-config';
import { readStorefrontAppConfig } from '../../support/app-config';

/** The two providers the storefront can load the shopping agent from. */
export type AgentProvider = 'miaw' | 'commerce-client';

/** Where the storefront offers to open the agent, per its own configuration. */
export interface AgentEntryPoints {
  header: boolean;
  search: boolean;
  floating: boolean;
}

/**
 * Whether this storefront is configured for the shopper-assistance journey.
 *
 * Both halves of the condition come from the app's own shipped configuration.
 * One is the flag that decides whether the agent mounts at all. The other is the
 * provider settings its own validation requires before it will initialize.
 *
 * Which settings those are depends on the provider, so an unmet condition names
 * the provider it was judged against.
 */
export interface ShopperAssistanceCondition {
  met: boolean;
  /** Why the journey does or does not exist here, for the skip annotation. */
  reason: string;
  provider: AgentProvider;
  entryPoints: AgentEntryPoints;
  /** The bundle the configured provider is loaded from. Empty when unset. */
  scriptUrl: string;
  /** The agent platform's own site id, which is not the shop's siteId. */
  agentSiteId: string;
  conversationContext: boolean;
}

/** The handover that gives the agent platform the shopper's Commerce identity. */
export interface TokenBridgeHandover {
  siteId?: string;
  authLinkKey?: string;
  accessToken?: string;
}

export interface AgentTraffic {
  configurationCalls: number;
  providerScripts: string[];
  handovers: TokenBridgeHandover[];
}

/** The storefront's own bridge to the agent platform. */
export const tokenBridgePath = '/api/agent/identity/bridge';

const CONFIGURATIONS = 'configuration/shopper-configurations/v1';

/** The global each provider's bundle publishes once it has loaded. */
export const providerGlobals = {
  miaw: 'embeddedservice_bootstrap',
  commerceClient: 'CimulateMessaging',
} as const;

/**
 * Names that only an agent provider's own bundle carries. They are how "no
 * provider was loaded at all" is proven: an unconfigured storefront has no bundle
 * URL to compare against.
 */
const providerScriptMarkers = ['embeddedservice', 'cimulate'];

/** Default CDN the Commerce Client bundle is built from when no URL is given. */
const commerceClientCdn = 'https://cdn.search.cimulate.ai/copilot-widget';

export const searchTerm = 'dress';

// --- The condition, proven before the browser starts ---

const isOn = (flag: string | undefined): boolean => flag === 'true';

const required = (value: string | undefined, name: string): string[] =>
  (value ?? '') === '' ? [`app.commerceAgent.${name} is empty`] : [];

const eitherRequired = (values: (string | undefined)[], names: string): string[] =>
  values.some((value) => (value ?? '') !== '') ? [] : [`app.commerceAgent.${names} are both empty`];

const providerOf = (agent: CommerceAgentConfig): AgentProvider =>
  agent.provider === 'commerce-client' ? 'commerce-client' : 'miaw';

const mountReasons = (agent: CommerceAgentConfig): string[] =>
  isOn(agent.enabled)
    ? []
    : [
        `app.commerceAgent.enabled is "${agent.enabled ?? 'unset'}" rather than "true", so the ` +
          'agent is never mounted',
      ];

// Every setting the storefront's own Embedded Messaging validation requires before
// it will render the agent window.
const miawReasons = (agent: CommerceAgentConfig): string[] => [
  ...required(agent.embeddedServiceName, 'embeddedServiceName'),
  ...required(agent.embeddedServiceEndpoint, 'embeddedServiceEndpoint'),
  ...required(agent.scriptSourceUrl, 'scriptSourceUrl'),
  ...required(agent.scrt2Url, 'scrt2Url'),
  ...required(agent.salesforceOrgId, 'salesforceOrgId'),
  ...required(agent.commerceOrgId, 'commerceOrgId'),
  ...required(agent.siteId, 'siteId'),
  ...required(agent.askAgentOnSearch, 'askAgentOnSearch'),
];

const commerceClientReasons = (agent: CommerceAgentConfig): string[] => [
  ...required(agent.scrt2Url, 'scrt2Url'),
  ...required(agent.salesforceOrgId, 'salesforceOrgId'),
  ...eitherRequired(
    [agent.cc_esDeveloperName, agent.embeddedServiceName],
    'cc_esDeveloperName and app.commerceAgent.embeddedServiceName',
  ),
  ...eitherRequired(
    [agent.cc_cdnVersion, agent.commerceClientScriptSourceUrl],
    'cc_cdnVersion and app.commerceAgent.commerceClientScriptSourceUrl',
  ),
];

const providerReasons = (agent: CommerceAgentConfig): string[] =>
  providerOf(agent) === 'commerce-client' ? commerceClientReasons(agent) : miawReasons(agent);

const commerceClientScript = (agent: CommerceAgentConfig): string =>
  agent.commerceClientScriptSourceUrl ??
  `${commerceClientCdn}/${agent.cc_cdnVersion ?? ''}/messaging.umd.js`;

const scriptUrlOf = (agent: CommerceAgentConfig): string =>
  providerOf(agent) === 'commerce-client'
    ? commerceClientScript(agent)
    : (agent.scriptSourceUrl ?? '');

const entryPointsOf = (agent: CommerceAgentConfig): AgentEntryPoints => ({
  header: isOn(agent.enableAgentFromHeader),
  search: isOn(agent.askAgentOnSearch),
  floating: isOn(agent.enableAgentFromFloatingButton),
});

const conditionReason = (reasons: string[], provider: AgentProvider): string =>
  reasons.length === 0
    ? `the Commerce Agent is enabled and its ${provider} provider configuration is complete`
    : `the shopper-assistance journey is not configured on this storefront (provider ` +
      `"${provider}"): ${reasons.join('; ')}`;

/**
 * The journey only exists while the storefront is configured for it, so the
 * condition is read from the app's own configuration before the browser starts.
 *
 * A storefront that will not serve its configuration throws rather than skips.
 * A broken shop must never read as "this journey does not apply here".
 */
export const shopperAssistanceCondition = async (
  request: APIRequestContext,
): Promise<ShopperAssistanceCondition> => {
  const agent = (await readStorefrontAppConfig(request)).commerceAgent ?? {};
  const provider = providerOf(agent);
  const reasons = [...mountReasons(agent), ...providerReasons(agent)];

  return {
    met: reasons.length === 0,
    reason: conditionReason(reasons, provider),
    provider,
    entryPoints: entryPointsOf(agent),
    scriptUrl: scriptUrlOf(agent),
    agentSiteId: agent.siteId ?? '',
    conversationContext: isOn(agent.enableConversationContext),
  };
};

export const configuredSkipReason =
  'this storefront is configured for the Commerce Agent, so it has no un-configured ' +
  'storefront to prove the absent-agent complement against';

export const noEntryPointSkipReason =
  'the Commerce Agent is enabled but configured to offer no header, search or floating ' +
  'entry point, so a shopper has no way to open it';

// --- Reading the storefront's own traffic, to place each step on a service ---

const pathOf = (request: Request): string => new URL(request.url()).pathname;

/** Shopper Configurations: the read the agent takes its Salesforce domain from. */
export const isConfigurationCall = (request: Request): boolean =>
  request.method() === 'GET' && pathOf(request).includes(`/${CONFIGURATIONS}/`);

export const isProviderScript =
  (scriptUrl: string) =>
  (request: Request): boolean =>
    scriptUrl !== '' && request.url() === scriptUrl;

export const providerScriptsIn = (traffic: AgentTraffic): string[] =>
  traffic.providerScripts.filter((url) =>
    providerScriptMarkers.some((marker) => url.toLowerCase().includes(marker)),
  );

export const isTokenBridgeCall = (request: Request): boolean =>
  request.method() === 'POST' && pathOf(request).endsWith(tokenBridgePath);

/**
 * The Commerce identity the storefront hands the agent platform. The SLAS access
 * token travels in the same request. The exception is a storefront that keeps its
 * session in HttpOnly cookies, where the server side supplies it instead.
 */
export const toTokenBridgeHandover = (request: Request): TokenBridgeHandover => {
  const body = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
  const field = (key: string): string | undefined => {
    const value = body[key];
    return typeof value === 'string' ? value : undefined;
  };
  return {
    siteId: request.headers()['x-site-id'],
    authLinkKey: field('auth_link_key'),
    accessToken: field('slas_access_token'),
  };
};

export const shopperSessionCookie = `usid_${env.scapi.siteId}`;
