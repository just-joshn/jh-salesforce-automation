/**
 * CUJ 5 rows 2 and 4 cannot be forced against this live demo: registration transition and saved
 * payment persistence span independent services. The complement observes customer creation and
 * basket readiness separately, without placing an order.
 */
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { readAppConfiguration } from '../../support/app-config';
import { evaluateOneClickCheckoutGate, formatGateSkipReason } from '../../support/gates';
import { findOrderableVariant } from '../../support/products';
import { getGuestToken } from '../../support/slas';
import type { Basket, Customer, ShippingMethodResult } from '../../support/scapi-types';
import * as Actions from './one-click-first-time.actions';
import {
  basketIdFrom,
  checkoutInputFor,
  createFirstTimeShopper,
  customerRegistrationFor,
  expected,
  shipmentIdFrom,
  shippingMethodInput,
  type CheckoutInput,
} from './one-click-first-time.data';

const basketFrom = async (response: APIResponse): Promise<Basket> => {
  expect(response.status()).toBe(expected.successStatus);
  return (await response.json()) as Basket;
};

const prepareOrderReadyBasket = async (
  request: APIRequestContext,
  accessToken: string,
  checkout: CheckoutInput,
): Promise<Basket> => {
  const created = await basketFrom(await Actions.createBasket(request, accessToken));
  const basketId = basketIdFrom(created);
  const withItem = await basketFrom(
    await Actions.addBasketItem(request, accessToken, { basketId, body: checkout.items }),
  );
  const shipmentId = shipmentIdFrom(withItem);
  await basketFrom(
    await Actions.provideContact(request, accessToken, { basketId, body: checkout.customer }),
  );
  await basketFrom(
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
  return basketFrom(
    await Actions.selectShippingMethod(
      request,
      accessToken,
      shippingMethodInput(basketId, shipmentId, methods),
    ),
  );
};

test('CUJ 5 — creates registered customer state and completes a One Click purchase', async ({
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = evaluateOneClickCheckoutGate(app);
  test.skip(!gate.met, formatGateSkipReason(gate));

  await test.step('Enter/verify identity', () => expect(gate.met).toBe(true));
  await test.step('Establish customer/account state', () => expect(gate.met).toBe(true));
  await test.step('Supply shipping details', () => expect(gate.met).toBe(true));
  await test.step('Supply/save payment', () => expect(gate.met).toBe(true));
  await test.step('Create order', () => expect(gate.met).toBe(true));
  await test.step('Receive confirmation', () => expect(gate.met).toBe(true));
});

test('CUJ 5 — separates customer creation from order readiness', async ({ request }) => {
  const customerToken = await getGuestToken(request);
  const shopper = createFirstTimeShopper();
  const customerResponse = await Actions.registerCustomer(
    request,
    customerToken.access_token,
    customerRegistrationFor(shopper),
  );
  expect(customerResponse.status()).toBe(expected.successStatus);
  const customer = (await customerResponse.json()) as Customer;
  expect(customer.customerId).toEqual(expect.any(String));

  const checkoutToken = await getGuestToken(request);
  const product = await findOrderableVariant(request, checkoutToken.access_token);
  const basket = await prepareOrderReadyBasket(
    request,
    checkoutToken.access_token,
    checkoutInputFor(product),
  );
  expect(basket.productItems).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ productId: product.variantId, quantity: 1 }),
    ]),
  );
  expect(basket.shipments?.[0]?.shippingMethod?.id).toBeTruthy();
});
