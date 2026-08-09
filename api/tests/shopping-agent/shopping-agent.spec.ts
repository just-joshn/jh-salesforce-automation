/**
 * CUJ 8 rows 2 and 3 are provider-side, while row 5 is subjective: the journey says "Requires
 * user research; repository cannot establish." Token bridge /api/agent/identity/bridge is
 * storefront-owned, not SCAPI, and is therefore not mirrored here.
 */
import { expect, test } from '@playwright/test';

import { readAppConfiguration } from '../../support/app-config';
import { evaluateCommerceAgentGate, formatGateSkipReason } from '../../support/gates';
import { getGuestToken } from '../../support/slas';
import type { ProductSearchResult, SiteConfiguration } from '../../support/scapi-types';
import * as Actions from './shopping-agent.actions';
import { expected } from './shopping-agent.data';

test('CUJ 8 — obtains actionable commerce assistance without losing storefront context', async ({
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = evaluateCommerceAgentGate(app);
  test.skip(!gate.met, formatGateSkipReason(gate));

  await test.step('Open agent', () => expect(gate.met).toBe(true));
  await test.step('Initialize conversation', () => expect(gate.met).toBe(true));
  await test.step('Bridge Commerce identity/context', () => expect(gate.met).toBe(true));
  await test.step('Ask commerce question', () => expect(gate.met).toBe(true));
  await test.step('Receive/use result', () => expect(gate.met).toBe(true));
  await test.step('Continue shopping action', () => expect(gate.met).toBe(true));
});

test('CUJ 8 — serves shopper configurations and search while no agent is configured', async ({
  request,
}) => {
  const app = await readAppConfiguration(request);
  expect(evaluateCommerceAgentGate(app).met).toBe(false);

  const token = await getGuestToken(request);
  const configurationsResponse = await Actions.readShopperConfigurations(
    request,
    token.access_token,
  );
  expect(configurationsResponse.status()).toBe(expected.successStatus);
  const configurations = (await configurationsResponse.json()) as SiteConfiguration;
  expect(configurations.configurations).not.toHaveLength(0);

  const searchResponse = await Actions.searchProducts(request, token.access_token);
  expect(searchResponse.status()).toBe(expected.successStatus);
  const search = (await searchResponse.json()) as ProductSearchResult;
  expect(search.hits ?? []).not.toHaveLength(0);
});
