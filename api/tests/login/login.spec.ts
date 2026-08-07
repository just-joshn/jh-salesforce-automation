import { expect, test } from '@playwright/test';
import { hasAccountCredentials } from '../../../config/env';
import type { Customer } from '../../support/scapi-types';
import { loginRegisteredShopper, requireSession } from '../../support/slas';
import * as Actions from './login.actions';
import { credentialsFromEnv, missingCredentialsReason } from './login.data';

test('sign in a registered shopper through the login service', async ({ request }) => {
  test.skip(!hasAccountCredentials(), missingCredentialsReason());
  test.setTimeout(60000);

  const credentials = credentialsFromEnv();

  // Browser-only step: opening /login. SLAS is the equivalent API login surface.
  const login = await loginRegisteredShopper(request, credentials.email, credentials.password);
  expect(login.loginStatus).toBe(303);
  const session = requireSession(login, credentials.email);

  const customerResponse = await Actions.readCustomer(
    request,
    session.accessToken,
    session.customerId,
  );
  expect(customerResponse.status()).toBe(200);
  const customer = (await customerResponse.json()) as Customer;

  // Browser-only assertion: login form becomes hidden. API proof is a registered
  // customer carrying the configured login rather than a guest profile.
  expect(customer.customerId).toBe(session.customerId);
  expect(customer.authType).toBe('registered');
  expect(customer.email).toBe(credentials.email);
});
