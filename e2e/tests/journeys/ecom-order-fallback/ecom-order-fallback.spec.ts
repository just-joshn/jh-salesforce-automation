import type { Request } from '@playwright/test';
import { expect, test } from '../../../support/fixtures';
import * as Actions from './ecom-order-fallback.actions';
import {
  accountUrlPattern,
  cancelOrderLabel,
  ecomOnlyOrder,
  expandValues,
  itemsWithOmsState,
  omsOnlyCall,
  orderActionsHeading,
  orderDetailCall,
  orderDetailTitle,
  orderDetailUrlPattern,
  orderHistoryUrlPattern,
  orderNumberLabel,
  shippingStatusLabel,
  startReturnLabel,
  statePattern,
  trackShipmentLabel,
  trackingHeading,
} from './ecom-order-fallback.data';
import * as Locators from './ecom-order-fallback.locators';

// The complement of CUJ 21, 22 and 23, and the only part of them the public demo
// can prove: an order Order Management has not ingested must expose none of the
// three OMS actions, must ask Order Management for nothing, and must fall back to
// its own ECOM state everywhere.
//
// This is what keeps the three conditional journeys honest. Their skip says "the
// action is not here"; this test says "and that is correct, because the order
// carries no OMS state" — otherwise an absent button could equally mean a broken
// page. Services: Shopper Orders/ECOM, and the OMS expansion being disregarded.
test('an order Order Management has not ingested exposes no OMS actions', async ({
  page,
  request,
}) => {
  test.setTimeout(300000);

  const condition = await ecomOnlyOrder(request);
  test.skip(!condition.met, condition.reason);

  const { credentials, order, payload } = condition;

  // The order was asked for under both OMS expansions and came back with no OMS
  // state at all — neither on the order nor on any of its lines. On a site Order
  // Management is not connected to, the expansion is disregarded rather than
  // failing, which is what the fallback rests on.
  expect(payload.omsData).toBeUndefined();
  expect(itemsWithOmsState(payload)).toBe(0);

  // Nothing the page would only ask Order Management for may be requested.
  const omsCalls: Request[] = [];
  page.on('request', (candidate) => {
    if (omsOnlyCall(candidate)) omsCalls.push(candidate);
  });

  await Actions.signIn(page, credentials);
  await expect(page).toHaveURL(accountUrlPattern);

  await Actions.openOrderHistory(page);
  await expect(page).toHaveURL(orderHistoryUrlPattern);

  const detailCall = page.waitForRequest(orderDetailCall(order.orderNo));
  await Actions.openOrder(page, orderNumberLabel(order.orderNo));
  await expect(page).toHaveURL(orderDetailUrlPattern(order.orderNo));

  // The page does ask for the OMS view; the site simply has none to give.
  expect(expandValues(await detailCall)).toEqual(['oms', 'oms_shipments']);
  await expect(Locators.orderDetailHeading(page, orderDetailTitle)).toBeVisible();
  await expect(Locators.detailText(page, orderNumberLabel(order.orderNo))).toBeVisible();

  // No OMS state, so no order actions exist — not a disabled Track Shipment, not
  // an inert Cancel Order, not a hidden Return Items. The whole block is absent.
  await expect(Locators.orderActions(page, orderActionsHeading)).toHaveCount(0);
  await expect(Locators.trackShipment(page)).toHaveCount(0);
  await expect(Locators.startReturn(page)).toHaveCount(0);
  await expect(Locators.namedButton(page, trackShipmentLabel)).toHaveCount(0);
  await expect(Locators.namedButton(page, cancelOrderLabel)).toHaveCount(0);
  await expect(Locators.namedButton(page, startReturnLabel)).toHaveCount(0);

  // And nowhere on the order is there a link out to a carrier.
  await expect(Locators.carrierLinks(page)).toHaveCount(0);

  // The fallback itself: the page still reports how the order stands and how it is
  // being handed over, taken from the ECOM order and its own shipment.
  await expect(Locators.detailText(page, statePattern(order.status))).toBeVisible();
  await expect(Locators.detailSection(page, trackingHeading)).toBeVisible();
  await expect(Locators.trackingSection(page)).toBeVisible();
  await expect(
    Locators.trackingText(page, statePattern(shippingStatusLabel(order.shippingStatus))),
  ).toBeVisible();
  await expect(Locators.trackingText(page, order.fulfillmentName)).toBeVisible();
  await expect(Locators.productLink(page, order.productName)).toBeVisible();

  // Success: the shopper saw their order in full, and Order Management was never
  // asked anything about it.
  expect(omsCalls).toHaveLength(0);
});
