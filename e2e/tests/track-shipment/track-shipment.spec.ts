import type { Page } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
import * as Actions from './track-shipment.actions';
import {
  accountUrlPattern,
  expandValues,
  intendedShipment,
  optionLabel,
  orderActionsHeading,
  orderDetailCall,
  orderDetailTitle,
  orderDetailUrlPattern,
  orderHistoryUrlPattern,
  orderNumberLabel,
  trackShipmentCondition,
} from './track-shipment.data';
import * as Locators from './track-shipment.locators';

// CUJ 21 — Track shipment through carrier: a shopper opens an eligible order,
// picks a shipment, and is handed off to the right carrier page for it. The order
// is retrieved from Shopper Orders with its OMS shipments, every carrier URL is
// validated and externalized before any tracking action is exposed, and the
// journey ends at the carrier service.
//
// Conditional journey: the storefront ships no flag for it — the action exists
// only while Order Management has ingested the order — so the condition is proven
// against the commerce services before the browser starts, and the test skips
// with the exact unmet setting when it is not.
test('a shopper tracks a shipment through its carrier', async ({ page, request }) => {
  test.setTimeout(300000);

  const condition = await trackShipmentCondition(request);
  test.skip(!condition.met, condition.reason);

  const { credentials, orderNo, trackable, withheldUrls } = condition;
  const intended = intendedShipment(condition);

  await Actions.signIn(page, credentials);
  await expect(page).toHaveURL(accountUrlPattern);

  // Start: the shopper opens the eligible order from their own history.
  await Actions.openOrderHistory(page);
  await expect(page).toHaveURL(orderHistoryUrlPattern);

  const detailCall = page.waitForRequest(orderDetailCall(orderNo));
  await Actions.openOrder(page, orderNumberLabel(orderNo));
  await expect(page).toHaveURL(orderDetailUrlPattern(orderNo));

  // The order is retrieved with its OMS shipments, which is what carries the
  // carrier details the journey depends on.
  expect(expandValues(await detailCall)).toEqual(['oms', 'oms_shipments']);
  await expect(Locators.orderDetailHeading(page, orderDetailTitle)).toBeVisible();
  await expect(Locators.detailText(page, orderNumberLabel(orderNo))).toBeVisible();

  // The order is OMS-backed, so the actions block exists at all.
  await expect(Locators.orderActions(page, orderActionsHeading)).toBeVisible();
  await expect(Locators.trackShipment(page)).toBeVisible();

  // Select the shipment. One trackable shipment is linked directly; several are
  // offered as named options, one per shipment, each labelled by its tracking
  // number where OMS holds one.
  let carrier: Page;
  if (trackable.length === 1) {
    await expect(Locators.trackShipment(page)).toHaveAttribute('href', intended.url);
    await expect(Locators.trackingOptions(page)).toHaveCount(0);
    carrier = await Actions.followTracking(page);
  } else {
    await Actions.openTrackingOptions(page);
    await expect(Locators.trackingOptionLinks(page)).toHaveCount(trackable.length);
    for (const shipment of trackable) {
      await expect(Locators.trackingOption(page, optionLabel(shipment))).toHaveAttribute(
        'href',
        shipment.url,
      );
    }
    carrier = await Actions.followTrackingOption(page, optionLabel(intended));
  }

  // The filtering half of the journey: a carrier URL that does not externalize is
  // withheld, so it never becomes a link the shopper can follow out of the app.
  for (const raw of withheldUrls) {
    await expect(Locators.linkWithHref(page, raw)).toHaveCount(0);
  }

  // Success: the carrier page for the shipment the shopper picked. Which page was
  // opened is the assertion; whether the carrier answers is the carrier's own
  // business, so the tab is never waited on.
  await expect.poll(() => carrier.url(), { timeout: 30000 }).toBe(intended.url);
  await carrier.close();
});
