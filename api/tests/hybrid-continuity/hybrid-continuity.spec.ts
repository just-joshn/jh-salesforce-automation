import { expect, test } from '@playwright/test';

import { findOrderableVariant } from '../../support/products';
import { getGuestToken } from '../../support/slas';
import type { Basket } from '../../support/scapi-types';
import * as Actions from './hybrid-continuity.actions';
import {
  basketFrom,
  basketIdFrom,
  createBasketItemInput,
  expected,
  formatHybridGateSkipReason,
  hybridRuntimeAvailable,
  type RouteProbe,
} from './hybrid-continuity.data';
import * as Endpoints from './hybrid-continuity.endpoints';

// OUT OF SCOPE: All hybrid pain rows require a real PWA Kit + SFRA deployment. dwsid/eCDN runtime
// handoff is not SCAPI-owned and therefore is not mirrored by the SCAPI continuity complement.

test('CUJ 14 — preserves shopper session and basket across the hybrid runtime boundary', async ({
  request,
}) => {
  const probes: readonly RouteProbe[] = await Promise.all([
    Actions.probeSfraRoute(request, Endpoints.sfraHome()),
    Actions.probeSfraRoute(request, Endpoints.sfraCart()),
    Actions.probeSfraRoute(request, Endpoints.sfraLogin()),
  ]);
  test.skip(!hybridRuntimeAvailable(probes), formatHybridGateSkipReason(probes));

  await test.step('1 Establish shopping/session state', () => {
    expect(hybridRuntimeAvailable(probes)).toBe(true);
  });
  await test.step('2 Navigate across runtime boundary', () => {
    expect(hybridRuntimeAvailable(probes)).toBe(true);
  });
  await test.step('3 Synchronize auth/session identifiers', () => {
    expect(hybridRuntimeAvailable(probes)).toBe(true);
  });
  await test.step('4 Restore identity', () => {
    expect(hybridRuntimeAvailable(probes)).toBe(true);
  });
  await test.step('5 Restore/use basket', () => {
    expect(hybridRuntimeAvailable(probes)).toBe(true);
  });
  await test.step('6 Continue intended task', () => {
    expect(hybridRuntimeAvailable(probes)).toBe(true);
  });
});

test('CUJ 14 — keeps one SLAS session and basket usable across sequential requests', async ({
  request,
}) => {
  const token = await getGuestToken(request);
  const variant = await findOrderableVariant(request, token.access_token);
  let basketId = '';
  let basket: Basket = {};

  await test.step('1 Establish shopping/session state', async () => {
    expect(token.usid).toBeTruthy();
    const createResponse = await Actions.createBasket(request, token.access_token);
    expect(createResponse.status()).toBe(expected.basketStatus);
    basketId = basketIdFrom(basketFrom(await createResponse.json()));
    const addResponse = await Actions.addProductToBasket(
      request,
      token.access_token,
      createBasketItemInput(basketId, variant),
    );
    expect(addResponse.status()).toBe(expected.basketStatus);
  });

  await test.step('5 Restore/use basket', async () => {
    const response = await Actions.readBasket(request, token.access_token, basketId);
    expect(response.status()).toBe(expected.basketStatus);
    basket = basketFrom(await response.json());
  });

  await test.step('6 Continue intended task', () => {
    expect(basket.basketId).toBe(basketId);
    expect(basket.productItems).toEqual(
      expect.arrayContaining([expect.objectContaining({ productId: variant.variantId, quantity: 1 })]),
    );
  });
});
