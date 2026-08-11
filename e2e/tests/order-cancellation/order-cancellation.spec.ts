/**
 * Authored-but-unproven: public demo has no active OMS integration, so happy path skips until an
 * OMS-active storefront and seeded order are configured. Cancellation uses a seeded order because a
 * fresh order can race allocation before cancellation begins.
 *
 * Out of scope: CUJ pain rows 5 (terminal 404/409) and 6 (state not refreshed) need controlled OMS
 * state, which would mean faking the service this journey exercises. Shipment tracking owns the
 * un-ingested-order complement proving OMS actions remain absent from ordinary orders.
 */
import {
  readOmsExpandedOrder,
  probeOmsAvailability,
  seededOmsOrderNumber,
} from '../../../api/support/oms';
import {
  requireAuthenticatedShopper,
  getGuestToken,
  loginRegisteredShopper,
} from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import { buildPath } from '../../support/site';
import * as Actions from './order-cancellation.actions';
import {
  hasOnlyCancellationEligibleItems,
  omsNotActiveFaultSuffix,
  orderCancellationSkipReason,
  preferredCancellationReason,
  requireActiveOmsMetadata,
  requireCancellationCredentials,
  requireSeededOrderNumber,
} from './order-cancellation.data';
import * as Locators from './order-cancellation.locators';

test('CUJ 16 — cancels an eligible Order-Management-managed order', async ({ page, request }) => {
  const guestToken = await getGuestToken(request);
  const availability = await probeOmsAvailability(request, guestToken.access_token);
  const seededOrder = seededOmsOrderNumber('cancel');
  const skipReason = orderCancellationSkipReason(availability, seededOrder);

  if (skipReason) {
    test.skip(true, skipReason);
    return;
  }

  const credentials = requireCancellationCredentials();
  const omsMetadata = requireActiveOmsMetadata(availability);
  const orderNo = requireSeededOrderNumber(seededOrder);
  const shopper = requireAuthenticatedShopper(
    await loginRegisteredShopper(request, credentials.email, credentials.password),
  );
  const cancellationReason = preferredCancellationReason(omsMetadata.cancelReasonCodes);

  await Actions.visitStorefront(page);
  await Actions.signIn(page, credentials);

  await test.step('Open eligible order', async () => {
    await Actions.openOrderDetail(page, orderNo);
    await expect(page).toHaveURL(buildPath(`/account/orders/${orderNo}`));
    await expect(Locators.orderDetailsHeading(page)).toBeVisible();
    await expect(Locators.orderNumber(page, orderNo)).toBeVisible();
  });

  await test.step('Verify cancellation eligibility', async () => {
    const order = await readOmsExpandedOrder(request, orderNo, shopper.accessToken);
    expect(hasOnlyCancellationEligibleItems(order.productItems)).toBe(true);
    await expect(Locators.cancelOrderButton(page)).toBeEnabled();
  });

  await test.step('Start cancellation', async () => {
    await Actions.startCancellation(page);
    await expect(Locators.cancellationDialog(page)).toBeVisible();
  });

  await test.step('Confirm reason/action', async () => {
    if (cancellationReason) {
      await Actions.selectCancellationReason(page, cancellationReason);
    }
    await expect(Locators.confirmCancellationButton(page)).toBeVisible();
  });

  await test.step('Submit to SOM', async () => {
    await Actions.confirmCancellation(page);
    await expect(Locators.cancellationSuccessAlert(page)).toBeVisible();
  });

  await test.step('View updated canceled state', async () => {
    await expect(Locators.canceledOrderStatus(page)).toBeVisible();
  });
});

test('CUJ 16 — reports Order Management as inactive rather than silently offering cancellation', async ({
  page,
  request,
}) => {
  await Actions.visitStorefront(page);
  await expect(Locators.storefrontMain(page)).toBeVisible();

  const guestToken = await getGuestToken(request);
  const availability = await probeOmsAvailability(request, guestToken.access_token);

  switch (availability.kind) {
    case 'active':
      throw new Error('Expected OMS metadata probe to report the public demo as inactive.');
    case 'gated':
      expect(availability.fault.type.endsWith(omsNotActiveFaultSuffix)).toBe(true);
  }
});
