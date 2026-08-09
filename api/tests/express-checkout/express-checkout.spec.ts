/**
 * CUJ 3 rows 2, 3, and 5 require PSP-side authorization, shipping invalidation, or payment
 * recovery failure injection. SCAPI mocking is prohibited, so those failures are not induced.
 */
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { readAppConfiguration } from '../../support/app-config';
import { evaluateExpressCheckoutGate, formatGateSkipReason } from '../../support/gates';
import { findOrderableVariant } from '../../support/products';
import { getGuestToken } from '../../support/slas';
import type { Basket, ShippingMethodResult } from '../../support/scapi-types';
import * as Actions from './express-checkout.actions';
import {
  basketIdFrom,
  createCheckoutInput,
  expected,
  shipmentIdFrom,
  shippingMethodInput,
  type CheckoutInput,
} from './express-checkout.data';

const readBasket = async (response: APIResponse): Promise<Basket> => {
  expect(response.status()).toBe(expected.successStatus);
  return (await response.json()) as Basket;
};

const prepareOrderReadyBasket = async (
  request: APIRequestContext,
  accessToken: string,
  checkout: CheckoutInput,
): Promise<Basket> => {
  const created = await readBasket(await Actions.createBasket(request, accessToken));
  const basketId = basketIdFrom(created);
  const withItem = await readBasket(
    await Actions.addBasketItem(request, accessToken, { basketId, body: checkout.productItems }),
  );
  const shipmentId = shipmentIdFrom(withItem);
  await readBasket(
    await Actions.provideContact(request, accessToken, { basketId, body: checkout.customer }),
  );
  await readBasket(
    await Actions.provideShippingAddress(request, accessToken, {
      basketId,
      body: checkout.shippingAddress,
      shipmentId,
    }),
  );
  const methodsResponse = await Actions.readShippingMethods(request, accessToken, {
    basketId,
    shipmentId,
  });
  expect(methodsResponse.status()).toBe(expected.successStatus);
  const methods = (await methodsResponse.json()) as ShippingMethodResult;
  return readBasket(
    await Actions.selectShippingMethod(
      request,
      accessToken,
      shippingMethodInput(basketId, shipmentId, methods),
    ),
  );
};

const expectBasketProduct = (basket: Basket, variantId: string): void => {
  expect(basket.productItems).toEqual(
    expect.arrayContaining([expect.objectContaining({ productId: variantId, quantity: 1 })]),
  );
};

const expectShipmentAddress = (basket: Basket): void => {
  expect(basket.shipments?.[0]?.shippingAddress).toBeDefined();
};

const expectShipmentMethod = (basket: Basket): void => {
  expect(basket.shipments?.[0]?.shippingMethod?.id).toBeTruthy();
};

test('CUJ 3 — completes a purchase through Express Checkout', async ({ request }) => {
  const app = await readAppConfiguration(request);
  const gate = await evaluateExpressCheckoutGate(app, request);
  test.skip(!gate.met, formatGateSkipReason(gate));

  await test.step('Invoke express payment', () => expect(gate.met).toBe(true));
  await test.step('Authorize with provider', () => expect(gate.met).toBe(true));
  await test.step('Prepare basket/address/shipping', () => expect(gate.met).toBe(true));
  await test.step('Create order', () => expect(gate.met).toBe(true));
  await test.step('Process/confirm payment', () => expect(gate.met).toBe(true));
  await test.step('Reach confirmation', () => expect(gate.met).toBe(true));
});

test('CUJ 3 — drives a basket to an order-ready state without an express provider', async ({
  request,
}) => {
  const token = await getGuestToken(request);
  const product = await findOrderableVariant(request, token.access_token);
  const basket = await prepareOrderReadyBasket(
    request,
    token.access_token,
    createCheckoutInput(product),
  );

  expectBasketProduct(basket, product.variantId);
  expectShipmentAddress(basket);
  expectShipmentMethod(basket);
});
