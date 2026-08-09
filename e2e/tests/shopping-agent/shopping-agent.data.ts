import { env } from '../../../config/env';
import type { CommerceAgentConfiguration } from '../../../api/support/app-config';

export interface ProviderBundleExpectation {
  readonly bundleUrlPattern: RegExp;
  readonly globalName: string;
}

export const searchTerm = 'shirt';
export const commerceSessionStorageKey = `access_token_${env.SFCC_SITE_ID}`;
export const tokenBridgePath = '/api/agent/identity/bridge';

export const miawBundleUrlPattern = /(?:embeddedservice|\/bootstrap(?:\.min)?\.js(?:[?#]|$))/i;
export const commerceClientBundleUrlPattern = /(?:cimulate|commerce[-_]?client)/i;
export const providerBundleUrlPatterns: readonly RegExp[] = Object.freeze([
  miawBundleUrlPattern,
  commerceClientBundleUrlPattern,
]);

const exactUrlPattern = (url: string): RegExp =>
  new RegExp(`^${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

const miawBundleExpectation = (
  agent: CommerceAgentConfiguration | undefined,
): ProviderBundleExpectation => {
  const scriptSourceUrl = agent?.scriptSourceUrl;
  return {
    bundleUrlPattern: scriptSourceUrl ? exactUrlPattern(scriptSourceUrl) : miawBundleUrlPattern,
    globalName: 'embeddedservice_bootstrap',
  };
};

const commerceClientBundleExpectation = (
  agent: CommerceAgentConfiguration | undefined,
): ProviderBundleExpectation => {
  const scriptSourceUrl = agent?.commerceClientScriptSourceUrl;
  return {
    bundleUrlPattern: scriptSourceUrl
      ? exactUrlPattern(scriptSourceUrl)
      : commerceClientBundleUrlPattern,
    globalName: 'CimulateMessaging',
  };
};

export const providerBundleExpectation = (
  agent: CommerceAgentConfiguration | undefined,
): ProviderBundleExpectation =>
  agent?.provider === 'commerce-client'
    ? commerceClientBundleExpectation(agent)
    : miawBundleExpectation(agent);
