import { expect, test } from '@playwright/test';

import { required } from '../../support/scapi';
import type { Customer, Fault } from '../../support/scapi-types';
import {
  getGuestToken,
  loginRegisteredShopper,
  requireAuthenticatedShopper,
} from '../../support/slas';
import * as Actions from './registration.actions';
import {
  createRegistrationDetails,
  toCustomerRegistrationRequest,
  toInvalidCustomerRegistrationRequest,
} from './registration.data';

// Out of scope: Pain rows 3 and 4 (backend customer-creation failure and immediate-login failure).
// A real service failure cannot be forced without faking SCAPI, which is the system under test.

test('CUJ 9 — registers a customer and authenticates the new account', async ({ request }) => {
  const guest = await test.step('Open registration', async () => getGuestToken(request));

  const details = await test.step('Enter required account details', () => {
    const value = createRegistrationDetails();
    expect(value.email).toMatch(/@mailinator\.com$/);
    return value;
  });

  const customer = await test.step('Create customer record', async () => {
    const response = await Actions.registerCustomer(
      request,
      guest.access_token,
      toCustomerRegistrationRequest(details),
    );
    expect(response.status()).toBe(200);
    const created = (await response.json()) as Customer;
    expect(created.email).toBe(details.email);
    return created;
  });

  const authenticated = await test.step('Authenticate new account', async () => {
    const result = await loginRegisteredShopper(request, details.email, details.password);
    expect(result.status).toBe(303);
    expect(result.accessToken).toBeTruthy();
    return requireAuthenticatedShopper(result);
  });

  await test.step('Reach registered account state', () => {
    expect(authenticated.customerId).toBe(required(customer.customerId, 'customer.customerId'));
  });
});

test('CUJ 9 — rejects registration when the email already belongs to a customer', async ({
  request,
}) => {
  const guest = await getGuestToken(request);
  const details = createRegistrationDetails();
  const registration = toCustomerRegistrationRequest(details);
  const firstResponse = await Actions.registerCustomer(request, guest.access_token, registration);
  expect(firstResponse.status()).toBe(200);

  const duplicateResponse = await Actions.registerCustomer(
    request,
    guest.access_token,
    registration,
  );
  expect(duplicateResponse.status()).toBe(400);
  const fault = (await duplicateResponse.json()) as Fault;
  expect(fault).toMatchObject({
    title: 'Login Already In Use',
    type: 'https://api.commercecloud.salesforce.com/documentation/error/v1/errors/login-already-in-use',
    detail: 'The login is already in use.',
  });
});

test('CUJ 9 — rejects registration when required account details are invalid', async ({
  request,
}) => {
  const guest = await getGuestToken(request);
  const details = createRegistrationDetails();
  const response = await Actions.registerCustomer(
    request,
    guest.access_token,
    toInvalidCustomerRegistrationRequest(details),
  );
  expect(response.status()).toBe(400);
  const fault = (await response.json()) as Fault;
  expect(`${fault.title} ${fault.type} ${fault.detail}`.toLowerCase()).toContain('last');
});
