/**
 * Authored-but-unproven: a seeded unallocated OMS order is required because fresh orders race
 * allocation. The runtime annotations record unavailable OMS outcome domains without faking SCAPI.
 */
import { probeOmsAvailability, seededOmsOrderNumber } from '../../support/oms';
import { getGuestToken } from '../../support/slas';
import { expect, test } from '@playwright/test';
import * as Actions from './order-cancellation.actions';
import * as Data from './order-cancellation.data';

test('CUJ 16 — cancels an eligible Order-Management-managed order', async ({ request }) => {
  test.info().annotations.push(
    {
      type: 'layer-scope',
      description:
        'CUJ 16 steps 3 and 4 are omitted in the API layer: starting cancellation and confirming reason/action are UI-modal affordances with no distinct Shopper Orders operation before POST oms-cancel-order; the browser layer covers them.',
    },
    {
      type: 'coverage-gap',
      description:
        'CUJ 16 pain-row-5 order-specific 404 and 409 eligibility-conflict domains cannot be provoked on this deployment. SCAPI mocking is prohibited because it is the system under test; observed oms-not-active 409 proves only that Order Management is disconnected, not an order-specific conflict.',
    },
  );

  const { access_token: accessToken } = await getGuestToken(request);
  const availability = await probeOmsAvailability(request, accessToken);
  const gate = Data.cancellationJourneyGate(availability, seededOmsOrderNumber('cancel'));
  if (gate.kind === 'skip') {
    test.skip(true, gate.reason);
    return;
  }

  const openedOrder = await test.step('Open eligible order', async () => {
    const response = await Actions.readCancellableOrder(request, gate.orderNo, accessToken);
    expect(response.status()).toBe(200);
    const order = Data.requireOrderPayload(await response.json());
    const orderNo = Data.orderNumber(order);
    expect(orderNo).toBe(gate.orderNo);
    return { order, orderNo };
  });

  await test.step('Verify cancellation eligibility', () => {
    expect(Data.hasOnlyCancellationEligibleItems(openedOrder.order.productItems)).toBe(true);
  });

  const body = Data.cancellationRequest(gate.reason);

  await test.step('Submit to SOM', async () => {
    const response = await Actions.cancelOmsOrder(request, openedOrder.orderNo, accessToken, body);
    expect(response.status()).toBe(200);
    const submittedOrder = Data.requireOrderPayload(await response.json());
    expect(Data.orderNumber(submittedOrder)).toBe(openedOrder.orderNo);
    expect(Data.hasCanceledOrderState(submittedOrder)).toBe(true);
  });

  await test.step('View updated canceled state', async () => {
    const response = await Actions.readCancellableOrder(request, openedOrder.orderNo, accessToken);
    expect(response.status()).toBe(200);
    const updatedOrder = Data.requireOrderPayload(await response.json());
    expect(Data.orderNumber(updatedOrder)).toBe(openedOrder.orderNo);
    expect(Data.hasCanceledOrderState(updatedOrder)).toBe(true);
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
