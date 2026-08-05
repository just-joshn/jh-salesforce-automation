import type { Page } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
import * as Actions from './shopper-assistance.actions';
import type { ShopperAssistanceCondition } from './shopper-assistance.data';
import {
  configuredSkipReason,
  isProviderScript,
  isTokenBridgeCall,
  noEntryPointSkipReason,
  providerGlobals,
  providerScriptsIn,
  searchTerm,
  shopperAssistanceCondition,
} from './shopper-assistance.data';
import * as Locators from './shopper-assistance.locators';

/**
 * Open the agent the way this storefront is configured to offer it. The header
 * entry is preferred when both exist because it is reachable from anywhere; the
 * search entry is the other one a storefront can own, and carries the shopper's
 * query as the conversation's opening context.
 */
const openAgent = async (page: Page, condition: ShopperAssistanceCondition): Promise<void> => {
  if (condition.entryPoints.header) {
    await expect(Locators.headerAgentButton(page)).toBeEnabled({ timeout: 30000 });
    await Actions.openAgentFromHeader(page);
    return;
  }
  await Actions.searchProducts(page, searchTerm);
  await expect(Locators.askAgentFromSearch(page)).toBeEnabled({ timeout: 30000 });
  await Actions.openAgentFromSearch(page);
};

const expectProviderLoaded = async (
  page: Page,
  condition: ShopperAssistanceCondition,
): Promise<void> => {
  const loaded = condition.provider === 'miaw' ? { miaw: true } : { commerceClient: true };
  await expect
    .poll(() => Actions.loadedProviders(page, providerGlobals), { timeout: 30000 })
    .toMatchObject(loaded);
};

// CUJ 25 — Obtain shopping assistance from an automated or human agent: the
// configured provider is loaded, the Commerce session and configuration it needs
// are retrieved, and opening the agent hands the shopper's Commerce identity to the
// agent platform so a contextual conversation can start (SLAS/Commerce session +
// Shopper Configurations + Embedded Messaging or Commerce Client + token bridge).
//
// Conditional journey: the agent only exists while the storefront is configured for
// it, so the condition is proven from the app's own shipped configuration before the
// browser starts and the test skips naming every setting that is not met.
//
// Scope worth knowing: the conversation window is the provider's own surface — an
// Embedded Messaging iframe, or the Commerce Client widget injected into the
// storefront's container — and the site, locale, currency, USID and auth type are
// passed to it through that provider's pre-chat API. What is asserted here is
// therefore the storefront's own half of the contract: the provider it loads, the
// Commerce configuration it reads, and the identity handover it makes. Typing into
// the provider's conversation, and escalation to a human agent, are that provider's
// behaviour rather than this storefront's, and are not asserted as if they were.
test('a shopper opens the shopping agent and it receives their Commerce session', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);

  const condition = await shopperAssistanceCondition(request);
  test.skip(!condition.met, condition.reason);
  test.skip(!condition.entryPoints.header && !condition.entryPoints.search, noEntryPointSkipReason);

  const traffic = Actions.recordAgentTraffic(page);

  // Load the configured provider: the storefront pulls in the exact bundle its
  // configuration names.
  const providerRequested = page.waitForRequest(isProviderScript(condition.scriptUrl), {
    timeout: 60000,
  });
  await Actions.openStorefront(page);
  await providerRequested;
  await expectProviderLoaded(page, condition);

  // Retrieve the Commerce session and configuration: the shopper already holds a
  // Commerce session, and Shopper Configurations is read for the Salesforce domain
  // the agent platform is reached on.
  expect(await Actions.shopperSessionId(page)).toBeTruthy();
  expect(traffic.configurationCalls).toBeGreaterThan(0);

  // Initialize the token bridge: opening the agent trades the shopper's Commerce
  // session for an identity the agent platform will accept.
  const handedOver = page.waitForRequest(isTokenBridgeCall, { timeout: 60000 });
  await openAgent(page, condition);
  await handedOver;

  // Success: the handover was made for this site, carrying the verification key the
  // conversation is started against.
  const [handover] = traffic.handovers;
  expect(handover?.siteId).toBe(condition.agentSiteId);
  expect(handover?.authLinkKey).toBeTruthy();
});

// The complement of CUJ 25, and the only part of it the public demo can prove: a
// storefront with no Commerce Agent configured must offer a shopper no way to reach
// one, must load neither provider, and must hand nothing to an agent platform.
//
// This is what keeps the conditional journey above honest. Its skip says "the agent
// is not here"; this says "and that is correct" — without it an absent button could
// equally mean a broken header or a provider that failed to load.
test('a storefront with no Commerce Agent offers a shopper no way to reach one', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);

  const condition = await shopperAssistanceCondition(request);
  test.skip(condition.met, configuredSkipReason);

  const traffic = Actions.recordAgentTraffic(page);
  await Actions.openStorefront(page);

  // Neither storefront-owned way in exists: no header entry, and no container for a
  // Commerce Client widget to be injected into.
  await expect(Locators.headerAgentButton(page)).toHaveCount(0);
  await expect(Locators.commerceClientWidget(page)).toHaveCount(0);

  // Search is the other context an agent would be offered from, and it works: the
  // shopper gets real suggestions and is offered no agent beside them. That is what
  // makes the absence a decision rather than a failure to render.
  await Actions.searchProducts(page, searchTerm);
  await expect(Locators.searchSuggestions(page)).toBeVisible({ timeout: 30000 });
  await expect(Locators.searchSuggestion(page)).toBeVisible();
  await expect(Locators.askAgentFromSearch(page)).toHaveCount(0);

  // Success: no provider bundle was loaded, neither provider published its global,
  // and the shopper's Commerce identity was never handed to an agent platform.
  expect(providerScriptsIn(traffic)).toHaveLength(0);
  expect(await Actions.loadedProviders(page, providerGlobals)).toEqual({
    miaw: false,
    commerceClient: false,
  });
  expect(traffic.handovers).toHaveLength(0);
});
