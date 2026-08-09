/**
 * Authored-but-unproven: return eligibility needs a seeded, shipped OMS order.
 *
 * Explicit non-goals: ReturnQuantityExceeded, InvalidReasonCode, UnknownProductItemIds, and 409
 * state conflict require forcing a specific SOM error. That would fake the service this journey
 * exists to exercise, which AGENTS.md bans.
 */
import { probeOmsAvailability, seededOmsOrderNumber } from '../../support/oms';
import { getGuestToken } from '../../support/slas';
import { expect, test } from '@playwright/test';
import * as Actions from './order-returns.actions';
import * as Data from './order-returns.data';

test('CUJ 17 — submits a return for an eligible Order-Management-managed item quantity', async ({
  request,
}) => {
  const { access_token: accessToken } = await getGuestToken(request);
  const availability = await probeOmsAvailability(request, accessToken);
  const gate = Data.returnJourneyGate(availability, seededOmsOrderNumber('return'));
  if (gate.kind === 'skip') {
    test.skip(true, gate.reason);
    return;
  }

  const order = await test.step('Open eligible OMS order', async () =>
    Actions.readReturnOrder(request, gate.orderNo, accessToken));

  const selection = await test.step('Start return/select items', () => {
    const nextSelection = Data.returnSelection(order, gate.metadata);
    expect(nextSelection.itemId).not.toBe('');
    return nextSelection;
  });

  await test.step('Choose valid quantity/reason', () => {
    expect(selection.quantity).toBeGreaterThan(0);
    expect(gate.metadata.returnReasonCodes.map((code) => code.reason)).toContain(selection.reason);
  });

  const body = await test.step('Review/submit return', () => Data.returnRequest(selection));

  const response = await test.step('SOM validates/creates return', async () =>
    Actions.submitOmsReturn(request, gate.orderNo, accessToken, body));

  await test.step('View refreshed return state', async () => {
    expect(response.status()).toBe(200);
    const updatedOrder = await Actions.readReturnOrder(request, gate.orderNo, accessToken);
    expect(updatedOrder.omsData).toBeDefined();
  });
});

test('CUJ 17 — exposes no return surface while Order Management is inactive', async ({
  request,
}) => {
  const { access_token: accessToken } = await getGuestToken(request);
  const availability = await probeOmsAvailability(request, accessToken);

  expect(availability.kind).toBe('gated');
  if (availability.kind === 'active') {
    throw new Error('Expected the public demo OMS probe to report inactive.');
  }
  expect(availability.fault.type.endsWith('/oms-not-active')).toBe(true);
});
