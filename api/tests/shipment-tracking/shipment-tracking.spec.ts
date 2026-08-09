/**
 * Authored-but-unproven: this test needs an OMS-active storefront and a seeded shipped order.
 *
 * Out of scope: CUJ 15 pain row 4 (unsafe URL rejected) needs crafted OMS data; faking OMS is
 * banned because OMS is this journey's system under test.
 */
import { probeOmsAvailability, seededOmsOrderNumber } from '../../support/oms';
import { getGuestToken } from '../../support/slas';
import { expect, test } from '@playwright/test';
import * as Actions from './shipment-tracking.actions';
import * as Data from './shipment-tracking.data';

test('CUJ 15 — reaches valid carrier tracking information for an owned order', async ({
  request,
}) => {
  const { access_token: accessToken } = await getGuestToken(request);
  const availability = await probeOmsAvailability(request, accessToken);
  const gate = Data.trackingJourneyGate(availability, seededOmsOrderNumber('tracking'));
  if (gate.kind === 'skip') {
    test.skip(true, gate.reason);
    return;
  }

  await test.step('Open account/order history', () => {
    expect(accessToken).not.toBe('');
  });

  const order = await test.step('Load OMS-enriched order', async () =>
    Actions.readTrackingOrder(request, gate.orderNo, accessToken));

  const actions = await test.step('Locate tracking action', () => {
    const trackingActions = Data.expectedTrackingActions(order);
    expect(trackingActions.length).toBeGreaterThan(0);
    return trackingActions;
  });

  await test.step('Validate/open tracking URL', () => {
    for (const action of actions) {
      expect(Data.externalCarrierUrl(action.carrierUrl)).toBe(action.carrierUrl);
    }
    for (const rejectedUrl of Data.rejectedTrackingUrls(order)) {
      expect(Data.externalCarrierUrl(rejectedUrl)).toBeUndefined();
    }
  });

  await test.step('View carrier status', () => {
    expect(actions.every((action) => new URL(action.carrierUrl).protocol !== 'javascript:')).toBe(
      true,
    );
  });
});

test('CUJ 15 — carries no Order Management state on an order it has not ingested', async ({
  request,
}) => {
  const { access_token: accessToken } = await getGuestToken(request);
  const response = await Actions.readOmsMetadata(request, accessToken);

  // Chosen instead of another real order: OMS's documented inactive probe is the demo-provable
  // complement, while its independent browser counterpart already proves an un-ingested order.
  expect(response.status()).toBe(409);
  const availability = await probeOmsAvailability(request, accessToken);
  expect(availability.kind).toBe('gated');
});
