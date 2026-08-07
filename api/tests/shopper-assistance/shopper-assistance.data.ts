import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { CommerceAgentConfig } from '../../support/app-config';
import { readStorefrontAppConfig } from '../../support/app-config';
import type {
  Configuration,
  ProductSearchHit,
  ProductSearchResult,
  SiteConfiguration,
} from '../../support/scapi-types';
import { scapiBaseUrl } from '../../../config/env';

export type AgentProvider = 'miaw' | 'commerce-client';

export interface AgentEntryPoints {
  header: boolean;
  search: boolean;
  floating: boolean;
}

export interface ShopperAssistanceCondition {
  met: boolean;
  reason: string;
  provider: AgentProvider;
  entryPoints: AgentEntryPoints;
  scriptUrl: string;
  agentSiteId: string;
  conversationContext: boolean;
  unmetSettings: string[];
}

const commerceClientCdn = 'https://cdn.search.cimulate.ai/copilot-widget';

export const searchTerm = 'dress';

export const configuredSkipReason =
  'this storefront is configured for the Commerce Agent, so it has no un-configured ' +
  'storefront to prove the absent-agent complement against';

export const noEntryPointSkipReason =
  'the Commerce Agent is enabled but configured to offer no header, search or floating ' +
  'entry point, so a shopper has no way to open it';

export const salesforceCommerceHost = new URL(scapiBaseUrl()).host;

export const siteConfiguration = async (response: APIResponse): Promise<SiteConfiguration> =>
  (await response.json()) as SiteConfiguration;

export const configurationsOf = (resource: SiteConfiguration): Configuration[] =>
  resource.configurations;

export const productSearchResult = async (response: APIResponse): Promise<ProductSearchResult> =>
  (await response.json()) as ProductSearchResult;

export const searchHits = (result: ProductSearchResult): ProductSearchHit[] => result.hits;

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
    unmetSettings: reasons,
  };
};
