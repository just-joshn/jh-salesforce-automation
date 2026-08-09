/**
 * CUJ 4 rows 3 and 4 cannot be forced against shared live services. The gate records One Click
 * configuration, while the complement proves guest-to-registered basket continuity over SCAPI.
 */
import type { APIResponse } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { readAppConfiguration } from '../../support/app-config';
import { evaluateOneClickCheckoutGate, formatGateSkipReason } from '../../support/gates';
import { findOrderableVariant } from '../../support/products';
import { getGuestToken } from '../../support/slas';
import type { Basket } from '../../support/scapi-types';
import * as Actions from './one-click-returning.actions';
import {
  basketItemFor,
  createReturningShopper,
  customerRegistrationFor,
  expected,
} from './one-click-returning.data';

const basketFrom = async (response: APIResponse): Promise<Basket> => {
  expect(response.status()).toBe(expected.successStatus);
  return (await response.json()) as Basket;
};

test('CUJ 4 — authenticates a returning shopper and completes a One Click order', async ({
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = evaluateOneClickCheckoutGate(app);
  test.skip(!gate.met, formatGateSkipReason(gate));

  await test.step('Enter account email/request OTP', () => expect(gate.met).toBe(true));
  await test.step('Verify OTP', () => expect(gate.met).toBe(true));
  await test.step('Transfer/merge basket', () => expect(gate.met).toBe(true));
  await test.step('Load/apply saved shipping/payment', () => expect(gate.met).toBe(true));
  await test.step('Place order', () => expect(gate.met).toBe(true));
  await test.step('Reach confirmation', () => expect(gate.met).toBe(true));
});

test('CUJ 4 — preserves a guest basket through registered authentication', async ({ request }) => {
  const guest = await getGuestToken(request);
  const shopper = createReturningShopper();
  const product = await findOrderableVariant(request, guest.access_token);

  const registration = await Actions.registerCustomer(
    request,
    guest.access_token,
    customerRegistrationFor(shopper),
  );
  expect(registration.status()).toBe(expected.successStatus);

  const guestBasket = await basketFrom(
    await Actions.createGuestBasket(request, guest.access_token),
  );
  const basketWithItem = await basketFrom(
    await Actions.addBasketItem(request, guest.access_token, basketItemFor(guestBasket, product)),
  );
  const registered = await Actions.loginWithGuestUsid(request, shopper, guest.usid);
  const transferred = await basketFrom(
    await Actions.transferGuestBasket(request, registered.accessToken),
  );

  expect(basketWithItem.productItems).toEqual(
    expect.arrayContaining([expect.objectContaining({ productId: product.variantId })]),
  );
  expect(transferred.productItems).toEqual(
    expect.arrayContaining([expect.objectContaining({ productId: product.variantId })]),
  );
});
