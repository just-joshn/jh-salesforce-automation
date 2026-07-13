import { expect, test } from '@playwright/test';
import { getGuestToken } from '../../support/slas';
import * as Actions from './register.actions';
import type { Customer, Fault } from './register.data';
import { invalidEmail, registrant, uniqueEmail } from './register.data';

// Sign up once, then confirm a duplicate email and a malformed email are both rejected.
test('register a new account, and reject duplicate and invalid emails', async ({ request }) => {
  const { accessToken } = await getGuestToken(request);
  const email = uniqueEmail();

  const response = await Actions.registerCustomer(request, accessToken, registrant(email));
  expect(response.status()).toBe(200);
  const customer = (await response.json()) as Customer;
  expect(customer.customerId).toBeTruthy();
  expect(customer.customerNo).toBeTruthy();
  expect(customer.login).toBe(email);

  // same email a second time must be rejected as a duplicate
  const duplicate = await Actions.registerCustomer(request, accessToken, registrant(email));
  expect(duplicate.status()).toBe(400);
  expect(((await duplicate.json()) as Fault).type).toContain('login-already-in-use');

  // a malformed email is rejected the same way
  const invalid = await Actions.registerCustomer(request, accessToken, registrant(invalidEmail));
  expect(invalid.status()).toBe(400);
});
