import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import type { AgentTraffic } from './shopper-assistance.data';
import {
  isConfigurationCall,
  isTokenBridgeCall,
  shopperSessionCookie,
  toTokenBridgeHandover,
} from './shopper-assistance.data';
import * as Locators from './shopper-assistance.locators';

/**
 * Start collecting the traffic that would carry this journey: the Commerce
 * configuration the agent reads, the provider bundles the page pulls in, and every
 * handover of the shopper's Commerce identity to the agent platform. Recording
 * begins before the first navigation because all three happen during load.
 */
export const recordAgentTraffic = (page: Page): AgentTraffic => {
  const traffic: AgentTraffic = { configurationCalls: 0, providerScripts: [], handovers: [] };
  page.on('request', (request) => {
    if (isConfigurationCall(request)) traffic.configurationCalls += 1;
    if (isTokenBridgeCall(request)) traffic.handovers.push(toTokenBridgeHandover(request));
    if (request.resourceType() === 'script') traffic.providerScripts.push(request.url());
  });
  return traffic;
};

export const openStorefront = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/'));
};

export const shopperSessionId = async (page: Page): Promise<string | undefined> =>
  (await page.context().cookies()).find((entry) => entry.name === shopperSessionCookie)?.value;

/** Which provider bundles have published their global on this page. */
export const loadedProviders = async (
  page: Page,
  globals: { miaw: string; commerceClient: string },
): Promise<{ miaw: boolean; commerceClient: boolean }> =>
  page.evaluate(
    (names) => ({
      miaw: names.miaw in window,
      commerceClient: names.commerceClient in window,
    }),
    globals,
  );

export const searchProducts = async (page: Page, term: string): Promise<void> => {
  await Locators.searchInput(page).click();
  await Locators.searchInput(page).fill(term);
};

export const openAgentFromHeader = async (page: Page): Promise<void> => {
  await Locators.headerAgentButton(page).click();
};

export const openAgentFromSearch = async (page: Page): Promise<void> => {
  await Locators.askAgentFromSearch(page).click();
};
