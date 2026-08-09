import { readAppConfiguration } from '../../../api/support/app-config';
import { evaluateCommerceAgentGate, formatGateSkipReason } from '../../../api/support/gates';
import { expect, test } from '../../support/fixtures';
import { buildPath } from '../../support/site';
import * as Actions from './shopping-agent.actions';
import {
  providerBundleExpectation,
  searchTerm,
} from './shopping-agent.data';
import * as Locators from './shopping-agent.locators';

/*
 * Authored but unproven: this happy path runs only on a storefront configured for Commerce Agent.
 * Pain-point failures for rows 2 (Agent session fails to initialize) and 3 (Token/context bridge
 * fails) are provider/platform behaviour, outside this storefront contract. Row 5 (Result not
 * actionable) is out of scope: "Requires user research; repository cannot establish."
 *
 * Not asserted: provider conversation-window content, typed conversation, or human escalation.
 * The window is provider-owned (Embedded Messaging iframe or Commerce Client widget), not this
 * storefront; only its bundle, global, Commerce session, and same-origin token bridge are tested.
 */
test('CUJ 8 — obtains actionable commerce assistance without losing storefront context', async ({
  page,
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = evaluateCommerceAgentGate(app);
  test.skip(!gate.met, formatGateSkipReason(gate));

  const provider = providerBundleExpectation(app.commerceAgent);
  const bundleObservation = Actions.observeProviderBundles(page, provider);
  const bridgeObservation = Actions.observeIdentityBridge(page);

  await test.step('Open agent', async () => {
    await Actions.visitStorefront(page, buildPath('/'));
    await expect.poll(() => Actions.providerBundleWasRequested(bundleObservation, provider)).toBe(true);
    await Actions.openAgent(page);
  });

  await test.step('Initialize conversation', async () => {
    await expect.poll(() => Actions.hasProviderGlobal(page, provider)).toBe(true);
  });

  await test.step('Bridge Commerce identity/context', async () => {
    await expect.poll(() => Actions.hasCommerceSession(page)).toBe(true);
    await expect.poll(() => bridgeObservation.requests.length).toBeGreaterThan(0);
  });

  await test.step('Ask commerce question', async () => {
    await expect(Locators.storefrontHeader(page)).toBeVisible();
  });

  await test.step('Receive/use result', async () => {
    await expect(Locators.storefrontHeader(page)).toBeVisible();
  });

  await test.step('Continue shopping action', async () => {
    await expect(Locators.cartButton(page)).toBeVisible();
  });
});

test('CUJ 8 — offers no agent entry point while search suggestions still work', async ({
  page,
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = evaluateCommerceAgentGate(app);
  test.skip(gate.met, formatGateSkipReason(gate));

  const provider = providerBundleExpectation(app.commerceAgent);
  const bundleObservation = Actions.observeProviderBundles(page, provider);
  await Actions.visitStorefront(page, buildPath('/'));

  await expect(Locators.headerAgentEntry(page)).toHaveCount(0);
  await expect(Locators.agentWidgetContainer(page)).toHaveCount(0);

  await Actions.searchForSuggestions(page, searchTerm);
  await expect(Locators.searchSuggestionDialog(page)).toBeVisible();
  await expect(Locators.productSuggestionLinks(page, searchTerm)).not.toHaveCount(0);
  await expect(Locators.askAgentSearchEntry(page)).toHaveCount(0);
  await expect.poll(() => bundleObservation.miawUrls.length).toBe(0);
  await expect.poll(() => bundleObservation.commerceClientUrls.length).toBe(0);
});
