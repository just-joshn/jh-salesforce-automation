/**
 * CUJ 8 rows 2 and 3 are provider-side, while row 5 is subjective: the journey says "Requires
 * user research; repository cannot establish." Token bridge /api/agent/identity/bridge is
 * storefront-owned, not SCAPI, and is therefore not mirrored here.
 */
import { expect, test } from '@playwright/test';

import { readAppConfiguration } from '../../support/app-config';
import { evaluateCommerceAgentGate } from '../../support/gates';
import { getGuestToken } from '../../support/slas';
import type { ProductSearchResult, SiteConfiguration } from '../../support/scapi-types';
import * as Actions from './shopping-agent.actions';
import { expected } from './shopping-agent.data';

test('CUJ 8 — serves shopper configurations and search while no agent is configured', async ({
  request,
}) => {
  const app = await readAppConfiguration(request);
  expect(evaluateCommerceAgentGate(app).met).toBe(false);

  test.info().annotations.push({
    type: 'layer-scope',
    description:
      'Every CUJ 8 critical task — Open agent, Initialize conversation, Bridge Commerce identity/context, Ask commerce question, Receive/use result, Continue shopping action — runs through Embedded Messaging and the storefront-owned token bridge, not SCAPI. There is no service analogue to mirror, so the browser layer owns this journey and the API layer asserts only the commerce surfaces the agent would consume.',
  });
  test.info().annotations.push({
    type: 'coverage-gap',
    description:
      'CUJ 8 pain rows 2 (agent session fails to initialize) and 3 (token/context bridge fails) are provider-side and storefront-side respectively. Row 5 (result not actionable) is subjective: the journey document states it requires user research this repository cannot establish.',
  });

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
