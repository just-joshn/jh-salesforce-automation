import { expect, test } from '@playwright/test';

import { findOrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type { Basket, Customer } from '../../support/scapi-types';
import {
  getGuestToken,
  loginRegisteredShopper,
  requireAuthenticatedShopper,
} from '../../support/slas';
import * as Actions from './password-login.actions';
import {
  createCredentials,
  createInvalidCredentials,
  toBasketItemRequest,
  toCustomerRegistrationRequest,
} from './password-login.data';

// Out of scope: Pain row 4 merge-conflict policy. It needs a deterministic pre-existing
// server-side basket on a shared account, which cannot be guaranteed on the live demo.

test('CUJ 10 — preserves the guest basket through registered login', async ({ request }) => {
  const guestBasket = await test.step('Build guest basket', async () => {
    const guest = await getGuestToken(request);
    const product = await findOrderableVariant(request, guest.access_token);
    const createResponse = await Actions.createGuestBasket(request, guest.access_token);
    expect(createResponse.status()).toBe(200);
    const created = (await createResponse.json()) as Basket;
    const basketId = required(created.basketId, 'basket.basketId');
    const itemResponse = await Actions.addBasketItem(request, {
      accessToken: guest.access_token,
      basketId,
      items: toBasketItemRequest(product),
    });
    expect(itemResponse.status()).toBe(200);
    const basketWithItem = (await itemResponse.json()) as Basket;
    expect(Actions.hasProduct(basketWithItem, product.variantId)).toBe(true);
    return { basketId, guest, product };
  });

  const authenticated = await test.step('Submit credentials', async () => {
    const credentials = createCredentials();
    const registrationResponse = await Actions.registerCustomer(
      request,
      guestBasket.guest.access_token,
      toCustomerRegistrationRequest(credentials),
    );
    expect(registrationResponse.status()).toBe(200);
    const customer = (await registrationResponse.json()) as Customer;
    const result = await Actions.loginWithGuestUsid(request, credentials, guestBasket.guest.usid);
    expect(result.status).toBe(303);
    expect(result.tokenStatus).toBe(200);
    expect(result.customerId).toBe(required(customer.customerId, 'customer.customerId'));
    expect(result.usid).toBe(guestBasket.guest.usid);
    expect(result.accessToken).toBeTruthy();
    return {
      accessToken: required(result.accessToken, 'registered access token'),
      customerId: required(result.customerId, 'registered customer id'),
    };
  });

  const registeredBasket = await test.step('Load registered basket context', async () => {
    const transferResponse = await Actions.transferGuestBasket(request, authenticated.accessToken);
    expect(transferResponse.status()).toBe(200);
    return (await transferResponse.json()) as Basket;
  });

  await test.step('Merge guest/registered baskets', () => {
    expect(Actions.hasProduct(registeredBasket, guestBasket.product.variantId)).toBe(true);
  });

  await test.step('Return to shopping/account', () => {
    expect(authenticated.customerId).toBeTruthy();
    expect(registeredBasket.basketId).toBeTruthy();
  });
});

test('CUJ 10 — refuses invalid credentials without issuing a token', async ({ request }) => {
  const credentials = createInvalidCredentials();
  const result = await loginRegisteredShopper(request, credentials.email, credentials.password);
  expect(result.status).toBe(401);
  expect(result.accessToken).toBeUndefined();
  expect(result.customerId).toBeUndefined();
  expect(() => requireAuthenticatedShopper(result)).toThrow(
    'SLAS registered login was not authenticated: HTTP 401',
  );
});
