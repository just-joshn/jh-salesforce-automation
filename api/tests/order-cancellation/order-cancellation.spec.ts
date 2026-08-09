/**
 * Authored-but-unproven: a seeded unallocated OMS order is required because fresh orders race
 * allocation. Out of scope: CUJ 16 pain rows 5 and 6 (terminal 404/409 and stale refresh) need
 * OMS state control, which would fake the service under test.
 */
import { probeOmsAvailability, seededOmsOrderNumber } from '../../support/oms';
import { getGuestToken } from '../../support/slas';
import { expect, test } from '@playwright/test';
import * as Actions from './order-cancellation.actions';
import * as Data from './order-cancellation.data';

test('CUJ 16 — cancels an eligible Order-Management-managed order', async ({ request }) => {
  const { access_token: accessToken } = await getGuestToken(request);
  const availability = await probeOmsAvailability(request, accessToken);
  const gate = Data.cancellationJourneyGate(availability, seededOmsOrderNumber('cancel'));
  if (gate.kind === 'skip') {
    test.skip(true, gate.reason);
    return;
  }

  await test.step('Open eligible order', () => {
    expect(gate.orderNo).not.toBe('');
  });

  const order = await test.step('Verify cancellation eligibility', async () => {
    const loadedOrder = await Actions.readCancellableOrder(request, gate.orderNo, accessToken);
    expect(Data.hasOnlyCancellationEligibleItems(loadedOrder.productItems)).toBe(true);
    return loadedOrder;
  });

  const body = await test.step('Start cancellation', () => {
    expect(order.productItems?.length).toBeGreaterThan(0);
    return Data.cancellationRequest(gate.reason);
  });

  await test.step('Confirm reason/action', () => {
    expect(body.reason).toBe(gate.reason);
  });

  const response = await test.step('Submit to SOM', async () =>
    Actions.cancelOmsOrder(request, gate.orderNo, accessToken, body),
  );

  await test.step('View updated canceled state', async () => {
    expect(response.status()).toBe(200);
    const updatedOrder = await Actions.readCancellableOrder(request, gate.orderNo, accessToken);
    expect(updatedOrder.omsData).toBeDefined();
  });
});

test('CUJ 16 — answers the OMS metadata probe with the documented oms-not-active fault', async ({
  request,
}) => {
  const { access_token: accessToken } = await getGuestToken(request);
  const response = await Actions.readOmsMetadata(request, accessToken);

  expect(response.status()).toBe(409);
  const fault = Data.requireInactiveOmsFault(await response.json());
  expect(fault.type.endsWith(Data.omsNotActiveFaultSuffix)).toBe(true);
});
