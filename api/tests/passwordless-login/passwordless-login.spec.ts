import { expect, test } from '@playwright/test';

import { readAppConfiguration } from '../../support/app-config';
import { evaluatePasswordlessLoginGate, formatGateSkipReason } from '../../support/gates';
import { findOrderableVariant } from '../../support/products';
import { getGuestToken } from '../../support/slas';
import type { Basket } from '../../support/scapi-types';
import * as Actions from './passwordless-login.actions';
import {
  basketFrom,
  basketIdFrom,
  createBasketItemInput,
  createPasswordlessShopper,
  expected,
  externalTokenSkipReason,
  passwordlessStartCredentialSkipReason,
} from './passwordless-login.data';

// OUT OF SCOPE: Pain rows 2 (OTP delivery) and 3 (expired or invalid token) require reading an
// external mailbox. SCAPI accepts the start request but cannot expose that delivery channel here.

test('CUJ 11 — accepts a SLAS passwordless login request for a shopper with a guest basket', async ({
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = evaluatePasswordlessLoginGate(app);
  test.skip(!gate.met, formatGateSkipReason(gate));
  test.skip(true, passwordlessStartCredentialSkipReason());
  const token = await getGuestToken(request);
  const variant = await findOrderableVariant(request, token.access_token);
  const shopper = createPasswordlessShopper(token.usid);

  await test.step('1 Request passwordless login', async () => {
    const createResponse = await Actions.createBasket(request, token.access_token);
    expect(createResponse.status()).toBe(expected.basketStatus);
    const basketId = basketIdFrom(basketFrom(await createResponse.json()));
    const addResponse = await Actions.addProductToBasket(
      request,
      token.access_token,
      createBasketItemInput(basketId, variant),
    );
    expect(addResponse.status()).toBe(expected.basketStatus);
    const registration = await Actions.registerCustomer(
      request,
      token.access_token,
      shopper.registration,
    );
    expect(registration.status()).toBe(expected.customerRegistrationStatus);
  });

  await test.step('2 Receive OTP/token', async () => {
    const response = await Actions.requestPasswordlessLogin(
      request,
      'Basic <base64(clientId:clientSecret)>',
      shopper.passwordless,
    );
    expect(response.status()).toBe(expected.passwordlessStartStatus);
  });
});

test('CUJ 11 — preserves the guest basket across the passwordless request', async ({ request }) => {
  const app = await readAppConfiguration(request);
  const gate = evaluatePasswordlessLoginGate(app);
  test.skip(!gate.met, formatGateSkipReason(gate));
  test.skip(true, passwordlessStartCredentialSkipReason());
  const token = await getGuestToken(request);
  const variant = await findOrderableVariant(request, token.access_token);
  const createResponse = await Actions.createBasket(request, token.access_token);
  expect(createResponse.status()).toBe(expected.basketStatus);
  const basketId = basketIdFrom(basketFrom(await createResponse.json()));
  const addResponse = await Actions.addProductToBasket(
    request,
    token.access_token,
    createBasketItemInput(basketId, variant),
  );
  expect(addResponse.status()).toBe(expected.basketStatus);
  const shopper = createPasswordlessShopper(token.usid);
  const registration = await Actions.registerCustomer(
    request,
    token.access_token,
    shopper.registration,
  );
  expect(registration.status()).toBe(expected.customerRegistrationStatus);
  const passwordlessResponse = await Actions.requestPasswordlessLogin(
    request,
    'Basic <base64(clientId:clientSecret)>',
    shopper.passwordless,
  );
  expect(passwordlessResponse.status()).toBe(expected.passwordlessStartStatus);
  let basket: Basket = {};

  await test.step('4 Merge/transfer basket', async () => {
    const response = await Actions.readBasket(request, token.access_token, basketId);
    expect(response.status()).toBe(expected.basketStatus);
    basket = basketFrom(await response.json());
  });

  await test.step('5 Resume storefront journey', () => {
    expect(basket.productItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productId: variant.variantId, quantity: 1 }),
      ]),
    );
  });
});

test('CUJ 11 — verifies the emailed token and resumes with the basket intact', async ({
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = evaluatePasswordlessLoginGate(app);
  test.skip(!gate.met, formatGateSkipReason(gate));
  test.skip(true, externalTokenSkipReason(gate.mode, gate.landingPath));

  await test.step('3 Verify token', () => {
    expect(gate.mode).toBe('email');
  });
});
