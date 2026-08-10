import { expect, test } from '@playwright/test';

import { evaluateSfraRouteGate, formatGateSkipReason } from '../../support/gates';
import { findOrderableVariant } from '../../support/products';
import { getGuestToken } from '../../support/slas';
import type { Basket } from '../../support/scapi-types';
import * as Actions from './hybrid-continuity.actions';
import {
  basketFrom,
  basketIdFrom,
  createBasketItemInput,
  expected,
  sessionCookieName,
  type RouteProbe,
} from './hybrid-continuity.data';
import * as Endpoints from './hybrid-continuity.endpoints';

// The cross-runtime body is authored against a deployment that actually serves SFRA routes and is
// unproven here, where every SFRA probe answers 404. It uses the built-in `request` fixture
// deliberately: that context persists cookies across calls, so the dwsid the SFRA runtime issues is
// readable through storageState(). `page.request` would bind to browser cookies, and this is the API
// layer.

test('CUJ 14 — preserves shopper session and basket across the hybrid runtime boundary', async ({
  request,
}) => {
  const probes: readonly RouteProbe[] = await Promise.all([
    Actions.probeSfraRoute(request, Endpoints.sfraHome()),
    Actions.probeSfraRoute(request, Endpoints.sfraCart()),
    Actions.probeSfraRoute(request, Endpoints.sfraLogin()),
  ]);
  const gate = evaluateSfraRouteGate(probes);
  test.skip(!gate.met, formatGateSkipReason(gate));

  test.info().annotations.push({
    type: 'coverage-gap',
    description:
      'CUJ 14 pain rows 3 (stale or truncated auth handoff), 4 (shopper appears logged out) and 5 (basket unavailable or different) are uncovered. Each needs a genuinely hybrid deployment whose handoff can be corrupted on demand; SCAPI is the system under test and mocking it is prohibited.',
  });

  const token = await getGuestToken(request);
  const variant = await findOrderableVariant(request, token.access_token);
  let basketId = '';
  let basket: Basket = {};

  await test.step('Establish shopping/session state', async () => {
    expect(token.usid).toBeTruthy();
    const created = await Actions.createBasket(request, token.access_token);
    expect(created.status()).toBe(expected.basketStatus);
    basketId = basketIdFrom(basketFrom(await created.json()));
    const added = await Actions.addProductToBasket(
      request,
      token.access_token,
      createBasketItemInput(basketId, variant),
    );
    expect(added.status()).toBe(expected.basketStatus);
  });

  await test.step('Navigate across runtime boundary', async () => {
    const response = await Actions.crossRuntimeBoundary(request, Endpoints.sfraCart());
    expect(response.status()).toBe(expected.sfraStatus);
  });

  const sessionCookie = await test.step('Synchronize auth/session identifiers', async () => {
    const cookie = await Actions.readSessionCookie(request);
    expect(cookie, `${sessionCookieName} must be issued across the runtime boundary`).toBeTruthy();
    return cookie;
  });

  await test.step('Restore identity', async () => {
    const response = await Actions.crossRuntimeBoundary(request, Endpoints.sfraHome());
    expect(response.status()).toBe(expected.sfraStatus);
    expect(
      await Actions.readSessionCookie(request),
      `${sessionCookieName} must identify the same session after a second SFRA request`,
    ).toBe(sessionCookie);
  });

  await test.step('Restore/use basket', async () => {
    const response = await Actions.readBasket(request, token.access_token, basketId);
    expect(response.status()).toBe(expected.basketStatus);
    basket = basketFrom(await response.json());
    expect(basket.basketId).toBe(basketId);
  });

  await test.step('Continue intended task', () => {
    expect(basket.productItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productId: variant.variantId, quantity: 1 }),
      ]),
    );
  });
});

test('CUJ 14 — keeps one SLAS session and basket usable across sequential requests', async ({
  request,
}) => {
  const token = await getGuestToken(request);
  const variant = await findOrderableVariant(request, token.access_token);
  let basketId = '';
  let basket: Basket = {};

  await test.step('Establish shopping/session state', async () => {
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

  await test.step('Restore/use basket', async () => {
    const response = await Actions.readBasket(request, token.access_token, basketId);
    expect(response.status()).toBe(expected.basketStatus);
    basket = basketFrom(await response.json());
  });

  await test.step('Continue intended task', () => {
    expect(basket.basketId).toBe(basketId);
    expect(basket.productItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productId: variant.variantId, quantity: 1 }),
      ]),
    );
  });
});
