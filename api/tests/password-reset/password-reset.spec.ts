import { expect, test } from '@playwright/test';

import { readAppConfiguration } from '../../support/app-config';
import {
  evaluatePasswordResetExternalCallbackGate,
  formatGateSkipReason,
} from '../../support/gates';
import { getGuestToken, loginRegisteredShopper } from '../../support/slas';
import * as Actions from './password-reset.actions';
import {
  accountManagerBasicCredentials,
  callbackResetForm,
  createPkcePair,
  createResetCustomer,
  expected,
  faultMessageFrom,
  passwordActionForm,
  passwordActionTokenFrom,
  unregisteredCallbackMessage,
} from './password-reset.data';

// Journey document scope constraint: this CUJ is cross-service only in callback/external-delivery
// mode, so native email mode is deliberately not covered. The callback journey is authored against a
// callback-mode SLAS client and is unproven here, where resetPassword.mode reads "email".

test('CUJ 13 — resets the account password through callback delivery', async ({ request }) => {
  const app = await readAppConfiguration(request);
  const gate = evaluatePasswordResetExternalCallbackGate(app);
  test.skip(!gate.met, formatGateSkipReason(gate));

  test.info().annotations.push({
    type: 'layer-scope',
    description:
      'Step "Deliver reset action" occurs in the external callback channel: SLAS POSTs the password action token to a callback URI registered against the SLAS client, which this suite cannot host. The token is instead minted through Shopper Customers, which is why the gate requires Account Manager credentials.',
  });
  test.info().annotations.push({
    type: 'coverage-gap',
    description:
      'CUJ 13 pain rows 2 (reset message not delivered), 3 (token expired or invalid) and 5 (reset mutation rejected) are uncovered. Inducing them requires failing the external delivery channel or forging an expired token; SCAPI is the system under test and mocking it is prohibited.',
  });

  const pkce = createPkcePair();
  const customer = createResetCustomer();
  const guest = await getGuestToken(request);

  await test.step('Request reset', async () => {
    const registration = await Actions.registerCustomer(
      request,
      guest.access_token,
      customer.registration,
    );
    expect(registration.status()).toBe(expected.customerRegistrationStatus);

    const response = await Actions.requestCallbackReset(
      request,
      callbackResetForm(customer.email, pkce),
    );
    expect(response.status()).toBe(expected.resetRequestStatus);
  });

  const actionToken = await test.step('Open reset landing path', async () => {
    const response = await Actions.requestResetToken(
      request,
      accountManagerBasicCredentials(),
      customer.resetTokenRequest,
    );
    expect(response.status()).toBe(expected.resetTokenStatus);
    const token = passwordActionTokenFrom(await response.json());
    expect(token).not.toBe('');
    return token;
  });

  const actionForm = await test.step('Enter new password', () => {
    const form = passwordActionForm(actionToken, customer, pkce);
    expect(form.new_password).toBe(customer.newPassword);
    expect(form.pwd_action_token).toBe(actionToken);
    return form;
  });

  await test.step('Apply password reset', async () => {
    const response = await Actions.applyPasswordAction(request, actionForm);
    expect(response.status()).toBe(expected.passwordActionStatus);
  });

  await test.step('Return to login', async () => {
    const result = await loginRegisteredShopper(request, customer.email, customer.newPassword);
    expect(result.status).toBe(expected.loginRedirectStatus);
    expect(result.accessToken).toBeTruthy();
  });
});

test('CUJ 13 — refuses callback delivery for a callback URI the SLAS client has not registered', async ({
  request,
}) => {
  const customer = createResetCustomer();
  const response = await Actions.requestCallbackReset(
    request,
    callbackResetForm(customer.email, createPkcePair()),
  );

  expect(response.status()).toBe(expected.unregisteredCallbackStatus);
  expect(faultMessageFrom(await response.json())).toBe(unregisteredCallbackMessage);
});
