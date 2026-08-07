import { expect, test } from '@playwright/test';
import { required } from '../../support/scapi';
import type { Basket, Customer } from '../../support/scapi-types';
import { getGuestToken, loginRegisteredShopper, requireSession } from '../../support/slas';
import * as Actions from './identity-account.actions';
import {
  basketLineFor,
  changedPassword,
  customerBasketsFrom,
  mergedBasketFor,
  mergedLineFor,
  newCredentials,
  orderableVariant,
  registrant,
  uniqueEmail,
} from './identity-account.data';

test('create a shopper account and reach the account area', async ({ request }) => {
  test.setTimeout(60000);

  const input = registrant(uniqueEmail());
  const guest = await getGuestToken(request);

  // Browser-only step: opening /registration. Shopper Customers is the API
  // registration surface.
  const registration = await Actions.registerCustomer(request, guest.accessToken, input);
  expect(registration.status()).toBe(200);

  const login = await loginRegisteredShopper(request, input.email, input.password);
  expect(login.loginStatus).toBe(303);
  const session = requireSession(login, input.email);

  const profileResponse = await Actions.readCustomer(
    request,
    session.accessToken,
    session.customerId,
  );
  expect(profileResponse.status()).toBe(200);
  const profile = (await profileResponse.json()) as Customer;

  // Browser-only assertions: account URL, Log Out, and profile card. API proof
  // is the registered session reading the matching persisted profile.
  expect(profile.customerId).toBe(session.customerId);
  expect(profile.authType).toBe('registered');
  expect(profile.firstName).toBe(input.firstName);
  expect(profile.lastName).toBe(input.lastName);
  expect(profile.email).toBe(input.email);
  expect(profile.login).toBe(input.email);
});

test('sign in recovers the existing shopping session', async ({ request }) => {
  test.setTimeout(120000);
  const credentials = newCredentials();
  const guest = await getGuestToken(request);

  const registration = await Actions.registerCustomer(
    request,
    guest.accessToken,
    registrant(credentials.email),
  );
  expect(registration.status()).toBe(200);
  const variant = await orderableVariant(request, guest.accessToken);

  const createdBasket = await Actions.createBasket(request, guest.accessToken);
  expect(createdBasket.status()).toBe(200);
  const basketId = required(((await createdBasket.json()) as Basket).basketId, 'basketId');

  const addedProduct = await Actions.addProductToBasket(
    request,
    guest.accessToken,
    basketId,
    variant.variantId,
  );
  expect(addedProduct.status()).toBe(200);
  const guestBasket = (await addedProduct.json()) as Basket;

  // Browser-only assertions: cart page and visible line. The guest basket
  // response proves the same variant is present before authentication.
  expect(guestBasket.basketId).toBe(basketId);
  expect(basketLineFor(guestBasket, variant.variantId).quantity).toBe(1);

  const login = await loginRegisteredShopper(request, credentials.email, credentials.password);
  expect(login.loginStatus).toBe(303);
  const session = requireSession(login, credentials.email);

  // Browser-only assertions: account URL and Log Out. Reading customer baskets
  // with the registered token proves the authenticated account area.
  const basketsResponse = await Actions.readCustomerBaskets(
    request,
    session.accessToken,
    session.customerId,
  );
  expect(basketsResponse.status()).toBe(200);
  const baskets = customerBasketsFrom(await basketsResponse.json());
  const mergedBasket = mergedBasketFor(baskets, variant.variantId);

  // Browser-only assertion: the line remains visible after reopening cart. The
  // signed-in customer-baskets resource proves the guest basket was merged.
  expect(mergedBasket.basketId).toBe(basketId);
  expect(mergedLineFor(mergedBasket, variant.variantId).quantity).toBe(1);
});

test('change password without losing the session', async ({ request }) => {
  test.setTimeout(120000);
  const credentials = newCredentials();
  const guest = await getGuestToken(request);

  const registration = await Actions.registerCustomer(
    request,
    guest.accessToken,
    registrant(credentials.email),
  );
  expect(registration.status()).toBe(200);

  const login = await loginRegisteredShopper(request, credentials.email, credentials.password);
  expect(login.loginStatus).toBe(303);
  const session = requireSession(login, credentials.email);

  const beforeChangeResponse = await Actions.readCustomer(
    request,
    session.accessToken,
    session.customerId,
  );
  expect(beforeChangeResponse.status()).toBe(200);
  const beforeChange = (await beforeChangeResponse.json()) as Customer;

  // Browser-only assertions: hydrated profile and password cards. Customer data
  // read through the signed-in token proves the account state is loaded.
  expect(beforeChange.authType).toBe('registered');
  expect(beforeChange.firstName).toBe('Test');
  expect(beforeChange.lastName).toBe('Portfolio');

  const changed = await Actions.changePassword(
    request,
    session.accessToken,
    session.customerId,
    credentials.password,
    changedPassword,
  );
  expect(changed.status()).toBe(204);

  const survivingSession = await Actions.readCustomer(
    request,
    session.accessToken,
    session.customerId,
  );
  expect(survivingSession.status()).toBe(200);
  const customer = (await survivingSession.json()) as Customer;

  // Browser-only assertions: success toast, account URL, Log Out, and visible
  // profile card. The original token still reading this registered customer is
  // the API proof that the session survived the credential change.
  expect(customer.customerId).toBe(session.customerId);
  expect(customer.authType).toBe('registered');
  expect(customer.email).toBe(credentials.email);

  await expect
    .poll(
      async () =>
        (await loginRegisteredShopper(request, credentials.email, credentials.password))
          .loginStatus,
      { timeout: 30000 },
    )
    .toBe(401);
  await expect
    .poll(
      async () =>
        (await loginRegisteredShopper(request, credentials.email, changedPassword)).accessToken !==
        undefined,
      { timeout: 30000 },
    )
    .toBe(true);
});
