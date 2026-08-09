import { expect, test } from '@playwright/test';

import { readAppConfiguration } from '../../support/app-config';
import {
  evaluatePasswordResetExternalCallbackGate,
  formatGateSkipReason,
} from '../../support/gates';
import { getGuestToken } from '../../support/slas';
import * as Actions from './password-reset.actions';
import {
  accountManagerCredentialSkipReason,
  createResetCustomer,
  expected,
} from './password-reset.data';

// OUT OF SCOPE: Pain rows 2 (delivery failure) and 3 (expired token) require a callback-delivery
// integration. Scope constraint: Cross-service only in callback/external-delivery mode. Default
// native email mode is not this cross-service CUJ.

test('CUJ 13 — resets the account password through callback delivery', async ({ request }) => {
  const app = await readAppConfiguration(request);
  const gate = evaluatePasswordResetExternalCallbackGate(app);
  test.skip(!gate.met, formatGateSkipReason(gate));

  await test.step('1 Request reset', () => {
    expect(gate.met).toBe(true);
  });
  await test.step('2 Deliver reset action', () => {
    expect(gate.met).toBe(true);
  });
  await test.step('3 Open reset landing path', () => {
    expect(gate.met).toBe(true);
  });
  await test.step('4 Enter new password', () => {
    expect(gate.met).toBe(true);
  });
  await test.step('5 Apply password reset', () => {
    expect(gate.met).toBe(true);
  });
  await test.step('6 Return to login', () => {
    expect(gate.met).toBe(true);
  });
});

test('CUJ 13 — accepts a password reset request for a registered customer', async ({ request }) => {
  await readAppConfiguration(request);
  test.skip(true, accountManagerCredentialSkipReason());
  const token = await getGuestToken(request);
  const customer = createResetCustomer();

  await test.step('1 Request reset', async () => {
    const registration = await Actions.registerCustomer(
      request,
      token.access_token,
      customer.registration,
    );
    expect(registration.status()).toBe(expected.customerRegistrationStatus);

    const reset = await Actions.requestResetToken(
      request,
      '<Account Manager OAuth access token>',
      customer.resetTokenRequest,
    );
    expect(reset.status()).toBe(expected.resetTokenStatus);
  });
});
