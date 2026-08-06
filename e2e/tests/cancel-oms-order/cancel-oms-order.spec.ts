import { expect, test } from '../../support/fixtures';
import * as Actions from './cancel-oms-order.actions';
import {
  accountUrlPattern,
  cancelCall,
  cancelImpactText,
  cancelModalHeading,
  cancelOrderCondition,
  cancelOrderLabel,
  cancelSuccessDescription,
  cancelSuccessTitle,
  cancelledBadgeText,
  confirmCancellationLabel,
  defaultReason,
  expandValues,
  orderActionsHeading,
  orderDetailCall,
  orderDetailTitle,
  orderDetailUrlPattern,
  orderHistoryUrlPattern,
  orderNumberLabel,
  reasonFieldLabel,
  submittedReason,
} from './cancel-oms-order.data';
import * as Locators from './cancel-oms-order.locators';

// CUJ 22 — Cancel eligible OMS order.
//
// A registered shopper who owns an OMS-backed order stops fulfilment before it
// reaches a terminal state. Identity, ownership and per-line eligibility are all
// read off the order. The cancellation goes to Order Management, and the page
// reports what OMS answered.
//
// Conditional journey. The storefront ships no flag for it: the action exists
// only while OMS has ingested the order and every line is still cancellable in
// full. So the condition is proven against the commerce services before the
// browser starts, and the test skips naming the exact unmet setting.
test('a registered shopper cancels an eligible OMS order', async ({ page, request }) => {
  test.setTimeout(300000);

  const condition = await cancelOrderCondition(request);
  test.skip(!condition.met, condition.reason);

  const { credentials, orderNo, reasonCodes } = condition;
  const preselected = defaultReason(reasonCodes);

  await Actions.signIn(page, credentials);
  await expect(page).toHaveURL(accountUrlPattern);

  // Start: the shopper opens the order from their own history and selects Cancel.
  await Actions.openOrderHistory(page);
  await expect(page).toHaveURL(orderHistoryUrlPattern);

  const detailCall = page.waitForRequest(orderDetailCall(orderNo));
  await Actions.openOrder(page, orderNumberLabel(orderNo));
  await expect(page).toHaveURL(orderDetailUrlPattern(orderNo));

  expect(expandValues(await detailCall)).toEqual(['oms', 'oms_shipments']);
  await expect(Locators.orderDetailHeading(page, orderDetailTitle)).toBeVisible();
  await expect(Locators.detailText(page, orderNumberLabel(orderNo))).toBeVisible();

  // Identity and eligibility both held, so the action is offered, not shown
  // inert. The button stays focusable when unavailable, so being enabled is what
  // proves eligibility. Being present is not enough.
  await expect(Locators.orderActions(page, orderActionsHeading)).toBeVisible();
  await expect(Locators.cancelOrder(page, cancelOrderLabel)).toBeVisible();
  await expect(Locators.cancelOrder(page, cancelOrderLabel)).toHaveAttribute(
    'aria-disabled',
    'false',
  );

  await Actions.startCancellation(page, cancelModalHeading(orderNo));
  await expect(Locators.cancelDialogText(page, cancelImpactText)).toBeVisible();
  await expect(Locators.keepOrder(page, 'Keep Order')).toBeVisible();

  // A shop that offers reasons preselects its default one.
  if (preselected !== '') {
    await expect(Locators.cancelReason(page, reasonFieldLabel)).toHaveValue(preselected);
    await Actions.chooseCancellationReason(page, reasonFieldLabel, preselected);
  }

  const submitted = page.waitForRequest(cancelCall(orderNo));
  await expect(Locators.confirmCancellation(page, confirmCancellationLabel)).toBeVisible();
  await Actions.confirmCancellation(page);

  // The cancellation goes to Order Management for this order, carrying the reason
  // when the shop asked for one.
  const cancellation = await submitted;
  expect(submittedReason(cancellation)).toBe(preselected === '' ? undefined : preselected);

  // Success: OMS acknowledged the cancellation, and the order now reads cancelled.
  await expect(Locators.feedbackText(page, cancelSuccessTitle)).toBeVisible({ timeout: 60000 });
  await expect(Locators.feedbackText(page, cancelSuccessDescription)).toBeVisible();
  await expect(Locators.orderStatusBadge(page, cancelledBadgeText)).toBeVisible();

  // A cancelled order is terminal, so the action is not offered a second time.
  await expect(Locators.cancelOrder(page, cancelOrderLabel)).toHaveAttribute(
    'aria-disabled',
    'true',
  );
});
