/**
 * Authored-but-unproven: public demo has no active OMS integration and no seeded tracking order, so
 * happy path skips until both conditions are configured against an OMS-active storefront.
 *
 * Out of scope: Pain row 4 ("Unsafe URL rejected") requires crafted hostile OMS data. Proving that
 * rejection would mean faking the service under test.
 */
import {
  probeOmsAvailability,
  readOmsExpandedOrder,
  seededOmsOrderNumber,
} from '../../../api/support/oms';
import { findOrderableVariant } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import { buildPath } from '../../support/site';
import * as Actions from './shipment-tracking.actions';
import * as Data from './shipment-tracking.data';
import * as Locators from './shipment-tracking.locators';

test('CUJ 15 — reaches valid carrier tracking information for an owned order', async ({
  page,
  request,
}) => {
  const { access_token: accessToken } = await getGuestToken(request);
  const availability = await probeOmsAvailability(request, accessToken);
  const gate = Data.trackingJourneyGate(availability, seededOmsOrderNumber('tracking'));
  if (gate.kind === 'skip') {
    console.info(`CUJ 15 skipped: ${gate.reason}`);
    test.skip(true, gate.reason);
    return;
  }

  await test.step('Open account/order history', async () => {
    await Actions.openOrderHistory(page);
    await expect(page).toHaveURL(buildPath('/account/orders'));
  });

  const order = await test.step('Load OMS-enriched order', async () => {
    await Actions.openOrderDetail(page, gate.orderNo);
    await expect(page).toHaveURL(buildPath(`/account/orders/${gate.orderNo}`));
    await expect(Locators.orderDetailsHeading(page)).toBeVisible();
    await expect(Locators.orderNumberOnDetail(page, gate.orderNo)).toBeVisible();
    return readOmsExpandedOrder(request, gate.orderNo, accessToken);
  });

  const trackingActions = Data.expectedTrackingActions(order);
  const navigation = Data.trackingNavigation(trackingActions);
  if (!navigation) {
    throw new Error('OMS tracking order contains no safe external carrier URL');
  }

  await test.step('Locate tracking action', async () => {
    expect(trackingActions.length).toBeGreaterThan(0);
    await expect(Locators.orderActionsHeading(page)).toBeVisible();
    const action =
      navigation.kind === 'single'
        ? Locators.trackShipmentLink(page)
        : Locators.trackShipmentButton(page);
    await expect(action).toBeVisible();
  });

  const carrierPage = await test.step('Validate/open tracking URL', async () => {
    const renderedHrefs = await Locators.allOrderLinks(page).evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')),
    );
    for (const trackingAction of trackingActions) {
      expect(renderedHrefs).toContain(trackingAction.href);
    }
    for (const rejectedUrl of Data.rejectedTrackingUrls(order)) {
      expect(renderedHrefs).not.toContain(rejectedUrl);
    }
    return Actions.openCarrierTracking(page, navigation);
  });

  await test.step('View carrier status', async () => {
    await expect(carrierPage).toHaveURL(navigation.href);
  });
});

test('CUJ 15 — offers no Order Management tracking action on an order it has not ingested', async ({
  page,
  request,
}) => {
  const discoveryToken = await getGuestToken(request);
  const product = await findOrderableVariant(request, discoveryToken.access_token);
  const checkout = Data.createCheckoutInput();

  await Actions.completeGuestCheckout(page, product.productId, checkout);
  await expect(Locators.confirmationHeading(page)).toBeVisible();
  const orderNumberLocator = Locators.orderNumber(page);
  await expect(orderNumberLocator).toBeVisible();
  const orderNo = Data.extractOrderNumber(await orderNumberLocator.innerText());
  const accessToken = await Actions.shopperAccessToken(page, Data.shopperAccessTokenKeyPrefix);

  const order = await readOmsExpandedOrder(request, orderNo, accessToken);
  expect(Data.carriesNoOmsData(order)).toBe(true);
  console.info(`REAL ORDER NUMBER: ${orderNo}`);
  console.info(`OMS EXPANSIONS PROOF: order ${orderNo} has no omsData under oms,oms_shipments`);

  await expect(Locators.createAccountHeading(page)).toBeVisible();
  await Actions.createPostCheckoutAccount(page, checkout.email, checkout.password);
  await Actions.openOrderDetail(page, orderNo);
  await expect(page).toHaveURL(buildPath(`/account/orders/${orderNo}`));
  await expect(Locators.orderDetailsHeading(page)).toBeVisible();
  await expect(Locators.orderNumberOnDetail(page, orderNo)).toBeVisible();
  await expect(Locators.orderActionsHeading(page)).not.toBeVisible();
  await expect(Locators.trackShipmentLink(page)).not.toBeVisible();
  await expect(Locators.trackShipmentButton(page)).not.toBeVisible();
  await expect(Locators.trackingHeading(page)).toBeVisible();
  await expect(Locators.trackingSectionLinks(page)).toHaveCount(0);

  const statusLabels = Data.ecomShipmentStatusLabels(order);
  expect(statusLabels.length).toBeGreaterThan(0);
  for (const statusLabel of statusLabels) {
    await expect(Locators.shipmentStatus(page, statusLabel)).toBeVisible();
  }
});
