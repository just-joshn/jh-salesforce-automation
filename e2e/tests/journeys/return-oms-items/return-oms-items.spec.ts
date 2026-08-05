import { expect, test } from '../../../support/fixtures';
import * as Actions from './return-oms-items.actions';
import {
  accountUrlPattern,
  availableToReturnLabel,
  defaultReason,
  expandValues,
  intendedLine,
  orderActionsHeading,
  orderDetailCall,
  orderDetailTitle,
  orderDetailUrlPattern,
  orderHistoryUrlPattern,
  orderNumberLabel,
  returnCall,
  returnItemsCondition,
  returnModalTitle,
  returnSuccessDescription,
  returnSuccessTitle,
  reviewQuantityLabel,
  reviewReasonLabel,
  reviewStepTitle,
  submittedLines,
} from './return-oms-items.data';
import * as Locators from './return-oms-items.locators';

// CUJ 23 — Return eligible order items: a registered shopper who owns an
// OMS-backed order initiates a return for the lines Order Management still
// accepts one for. Returnability and its per-line limit are OMS's answer, the
// chosen quantity is validated against that limit before anything is submitted,
// and the return goes to Order Management.
//
// Conditional journey: the storefront ships no flag for it — the action exists
// only while Order Management has ingested the order and reports a returnable
// quantity on it — so the condition is proven against the commerce services
// before the browser starts, and the test skips with the exact unmet setting.
//
// The stale-quantity and unknown-item recoveries the journey allows for are not
// asserted here: reaching them means making Order Management answer 400 with a
// specific errorCode, which can only be forced by faking the service the journey
// exists to exercise. What is asserted instead is the validation that stands
// between the shopper and those failures — the quantity cannot leave the modal
// above the limit OMS currently reports.
test('a registered shopper returns eligible items from an OMS order', async ({ page, request }) => {
  test.setTimeout(300000);

  const condition = await returnItemsCondition(request);
  test.skip(!condition.met, condition.reason);

  const { credentials, orderNo, reasonCodes } = condition;
  const line = intendedLine(condition);
  const preselected = defaultReason(reasonCodes);

  await Actions.signIn(page, credentials);
  await expect(page).toHaveURL(accountUrlPattern);

  await Actions.openOrderHistory(page);
  await expect(page).toHaveURL(orderHistoryUrlPattern);

  const detailCall = page.waitForRequest(orderDetailCall(orderNo));
  await Actions.openOrder(page, orderNumberLabel(orderNo));
  await expect(page).toHaveURL(orderDetailUrlPattern(orderNo));

  expect(expandValues(await detailCall)).toEqual(['oms', 'oms_shipments']);
  await expect(Locators.orderDetailHeading(page, orderDetailTitle)).toBeVisible();
  await expect(Locators.detailText(page, orderNumberLabel(orderNo))).toBeVisible();

  // Start: the shopper selects Return Items. The action is offered rather than
  // shown inert, which is what proves OMS reported something as returnable.
  await expect(Locators.orderActions(page, orderActionsHeading)).toBeVisible();
  await expect(Locators.startReturn(page)).toHaveAttribute('aria-disabled', 'false');

  await Actions.startReturn(page, orderNo);
  await expect(Locators.returnModalText(page, returnModalTitle(orderNo))).toBeVisible();

  // Only the lines Order Management holds a returnable quantity for are offered,
  // each stating its own limit.
  await expect(Locators.itemRows(page)).toHaveCount(condition.returnable.length);
  const row = Locators.itemRows(page).first();
  await expect(Locators.rowText(row, availableToReturnLabel(line.availableToReturn))).toBeVisible();

  // Nothing is submittable until a line and a reason are chosen.
  await expect(Locators.reviewReturn(page)).toHaveAttribute('aria-disabled', 'true');

  await Actions.selectLine(row);
  await expect(Locators.itemReason(row)).toHaveValue(preselected);

  // Validate against the latest limit: a quantity above what OMS currently allows
  // cannot survive the field, so a stale over-request never reaches the service.
  await Actions.enterQuantity(row, line.availableToReturn + 1);
  await expect(Locators.itemQuantity(row)).toHaveValue(String(line.availableToReturn));

  await Actions.chooseReason(row, preselected);
  await expect(Locators.reviewReturn(page)).toHaveAttribute('aria-disabled', 'false');

  // Review what will be sent, in the shop's own words.
  await Actions.reviewReturn(page, reviewStepTitle);
  await expect(Locators.reviewRows(page)).toHaveCount(1);
  const review = Locators.reviewRows(page).first();
  await expect(Locators.rowText(review, reviewQuantityLabel(line.availableToReturn))).toBeVisible();
  await expect(Locators.rowText(review, reviewReasonLabel(preselected))).toBeVisible();

  const submitted = page.waitForRequest(returnCall(orderNo));
  await Actions.submitReturn(page);

  // The return goes to Order Management for the chosen line and quantity. The
  // reason is absent because the shopper kept the default one, which the
  // storefront leaves for the service to apply.
  expect(submittedLines(await submitted)).toEqual([
    { itemId: line.itemId, quantity: line.availableToReturn },
  ]);

  // Success: the return was accepted and the shopper is told so.
  await expect(Locators.feedbackText(page, returnSuccessTitle)).toBeVisible({ timeout: 60000 });
  await expect(Locators.feedbackText(page, returnSuccessDescription)).toBeVisible();
});
