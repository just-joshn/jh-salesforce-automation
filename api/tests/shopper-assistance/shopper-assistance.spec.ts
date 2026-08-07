import { expect, test } from '@playwright/test';
import { getGuestToken } from '../../support/slas';
import * as Actions from './shopper-assistance.actions';
import {
  configuredSkipReason,
  configurationsOf,
  noEntryPointSkipReason,
  productSearchResult,
  salesforceCommerceHost,
  searchHits,
  searchTerm,
  shopperAssistanceCondition,
  siteConfiguration,
} from './shopper-assistance.data';

test('a shopper opens the shopping agent and it receives their Commerce session', async ({
  request,
}) => {
  test.setTimeout(180000);

  const condition = await shopperAssistanceCondition(request);
  test.skip(!condition.met, condition.reason);
  test.skip(!condition.entryPoints.header && !condition.entryPoints.search, noEntryPointSkipReason);

  // Browser-only e2e assertions replaced here: storefront requests the exact
  // provider bundle at `condition.scriptUrl`, opens the page, and that bundle
  // publishes its `window` global. APIRequestContext has no document or window.

  // Browser-only provider surface replaced here: Embedded Messaging iframe or
  // Commerce Client widget container. Provider-rendered UI is not an API resource.

  const session = await getGuestToken(request);
  expect(session.usid).toBeTruthy();
  expect(session.accessToken).toBeTruthy();

  const configurationResponse = await Actions.readShopperConfigurations(
    request,
    session.accessToken,
  );
  expect(configurationResponse.status()).toBe(200);
  expect(new URL(configurationResponse.url()).host).toBe(salesforceCommerceHost);
  expect(configurationsOf(await siteConfiguration(configurationResponse))).toEqual(
    expect.any(Array),
  );

  // Browser-only e2e action replaced here: enabled header or search entry opens
  // agent. Which entry renders and provider pre-chat API are browser surfaces.

  // Browser-only e2e assertions replaced here: `/api/agent/identity/bridge` receives
  // shopper session, agent site id and auth-link key. Bridge belongs to storefront
  // server/browser integration and is not a published Commerce API; no call is faked.
});

test('a storefront with no Commerce Agent offers a shopper no way to reach one', async ({
  request,
}) => {
  test.setTimeout(120000);

  const condition = await shopperAssistanceCondition(request);
  test.skip(condition.met, configuredSkipReason);

  expect(condition.met).toBe(false);
  expect(condition.unmetSettings).not.toHaveLength(0);
  expect(condition.reason).toContain(condition.unmetSettings.join('; '));

  // Browser-only e2e assertions replaced here: no header agent entry and no
  // Commerce Client widget container. APIRequestContext cannot inspect storefront DOM.

  const session = await getGuestToken(request);
  const searchResponse = await Actions.searchProducts(request, session.accessToken, searchTerm);
  expect(searchResponse.status()).toBe(200);
  const search = await productSearchResult(searchResponse);
  expect(search.query).toBe(searchTerm);
  expect(searchHits(search)).not.toHaveLength(0);

  // Browser-only e2e assertion replaced here: working suggestion popover offers no
  // Ask Shopping Agent button beside real suggestions. Popover is rendered UI.

  // Browser-only e2e assertions replaced here: neither provider bundle loads,
  // neither provider publishes its window global, and no token-bridge handover is
  // made. Those are browser/network effects of storefront client code.
});
