import { expect, test } from '@playwright/test';
import { getGuestToken } from '../../support/slas';
import * as Actions from './signin.actions';
import type { Customer } from './signin.data';
import { registrant, uniqueEmail, wrongPassword } from './signin.data';

// Sign in a registered shopper, confirm the session is theirs, and reject a wrong password.
test('sign in the correct shopper and reject a wrong password', async ({ request }) => {
  const { accessToken: guestToken } = await getGuestToken(request);
  const account = registrant(uniqueEmail());
  expect((await Actions.registerCustomer(request, guestToken, account)).status()).toBe(200);

  const login = await Actions.signIn(request, account.email, account.password);
  expect(login.loginStatus).toBe(303);
  const { accessToken, customerId } = login;
  if (!accessToken || !customerId) throw new Error('expected an authenticated session');

  // the session belongs to the shopper who signed in
  const profileResponse = await Actions.getCustomer(request, accessToken, customerId);
  expect(profileResponse.status()).toBe(200);
  expect(((await profileResponse.json()) as Customer).login).toBe(account.email);

  // a wrong password must not sign the shopper in
  const guest2 = await getGuestToken(request);
  const account2 = registrant(uniqueEmail());
  expect((await Actions.registerCustomer(request, guest2.accessToken, account2)).status()).toBe(
    200,
  );
  const badLogin = await Actions.signIn(request, account2.email, wrongPassword);
  expect(badLogin.loginStatus).toBe(401);
  expect(badLogin.accessToken).toBeUndefined();
});
