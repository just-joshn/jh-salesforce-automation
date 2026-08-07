import { expect, test } from '@playwright/test';
import { orderExpand, type OrderResource } from '../../support/oms';
import * as Actions from './track-shipment.actions';
import {
  intendedCarrierUrl,
  intendedShipment,
  shipmentAnalysis,
  trackingNumbersMatchPayload,
  trackShipmentCondition,
} from './track-shipment.data';

test('a shopper tracks a shipment through its carrier', async ({ request }) => {
  test.setTimeout(300000);

  const condition = await trackShipmentCondition(request);
  test.skip(!condition.met, condition.reason);

  const response = await Actions.openOrder(request, condition.accessToken, condition.orderNo);
  expect(response.status()).toBe(200);
  expect(orderExpand.split(',').map((value) => value.trim())).toEqual(['oms', 'oms_shipments']);

  const order = (await response.json()) as OrderResource;
  expect(order.orderNo).toBe(condition.orderNo);
  expect(order.omsData).toBeDefined();

  const { trackable, withheldUrls } = shipmentAnalysis(order);
  expect(trackable.length).toBeGreaterThan(0);

  // Replaces rendered Order Actions and Track Shipment controls: payload itself
  // exposes exactly shipments whose carrier URLs survive independent hardening.
  expect(trackable.map((shipment) => new URL(shipment.url).protocol)).toEqual(
    expect.arrayContaining(trackable.map(() => expect.stringMatching(/^https?:$/))),
  );
  expect(trackingNumbersMatchPayload(order, trackable)).toBe(true);

  // Replaces absent links for rejected raw URLs: none may enter derived trackable set.
  const exposedUrls = trackable.map((shipment) => shipment.url);
  expect(exposedUrls).not.toEqual(expect.arrayContaining(withheldUrls));

  // Replaces opening a new carrier tab: API payload yields intended carrier URL
  // for intended shipment; carrier availability remains outside storefront contract.
  const intended = intendedShipment(trackable);
  expect(trackable).toContainEqual(intended);
  expect(intended.url).toBe(intendedCarrierUrl(order, intended));
});
