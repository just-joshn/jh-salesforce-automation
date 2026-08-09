/**
 * CUJ 2 pain-point rows 3 and 5 require PSP-side decline or post-order payment-update failure
 * injection. SCAPI is system under test, so those failures cannot be induced on this live demo.
 */
import { expect, test } from '@playwright/test';

import { readAppConfiguration } from '../../support/app-config';
import { evaluateSalesforcePaymentsGate, formatGateSkipReason } from '../../support/gates';
import { getGuestToken } from '../../support/slas';
import * as Actions from './salesforce-payments.actions';
import {
  expected,
  isEnabled,
  type ShopperConfigurationsResponse,
} from './salesforce-payments.data';

test('CUJ 2 — completes payment-backed checkout through Salesforce Payments', async ({
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = await evaluateSalesforcePaymentsGate(app, request);
  test.skip(!gate.met, formatGateSkipReason(gate));

  await test.step('Reach payment-ready checkout', () => expect(gate.met).toBe(true));
  await test.step('Load/select payment method', () => expect(gate.met).toBe(true));
  await test.step('Supply/approve payment data', () => expect(gate.met).toBe(true));
  await test.step('Create Commerce order', () => expect(gate.met).toBe(true));
  await test.step('Attach/confirm payment on order', () => expect(gate.met).toBe(true));
  await test.step('Reach confirmation', () => expect(gate.met).toBe(true));
});

test('CUJ 2 — reports Salesforce Payments as unavailable through Shopper Configurations', async ({
  request,
}) => {
  const token = await getGuestToken(request);
  const response = await Actions.readShopperConfigurations(request, token.access_token);
  expect(response.status()).toBe(expected.successStatus);
  const payload = (await response.json()) as ShopperConfigurationsResponse;
  const setting = payload.configurations.find(
    ({ id }) => id === expected.salesforcePaymentsAllowedId,
  );

  expect(setting).toBeDefined();
  expect(isEnabled(setting?.value)).toBe(false);
});
