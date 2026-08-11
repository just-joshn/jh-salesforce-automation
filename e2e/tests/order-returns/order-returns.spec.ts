import {
  readOmsExpandedOrder,
  probeOmsAvailability,
  seededOmsOrderNumber,
} from '../../../api/support/oms';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import { buildPath } from '../../support/site';
import * as Actions from './order-returns.actions';
import * as Data from './order-returns.data';
import * as Locators from './order-returns.locators';

/*
 * Authored-but-unproven: return lines become eligible only after shipment, OMS ingestion is not
 * retroactive, and this public demo has no OMS connection. Seed E2E_OMS_RETURN_ORDER_NO on an
 * OMS-active storefront rather than placing an order during this journey.
 *
 * Return-flow locators are authored against documented OMS return UI and remain unproven on this
 * deployment.
 *
 * Non-goals: ReturnQuantityExceeded, InvalidReasonCode, UnknownProductItemIds, 409 state conflicts,
 * and network/server failures need a specific SOM rejection. Forcing one would fake SCAPI/SOM, which
 * is banned because it is this journey's system under test. The exceeded-quantity test below instead
 * covers client validation before those authoritative failures. CUJ 15 owns real-order proof that an
 * un-ingested order offers no OMS actions.
 */

const skipWhenReturnJourneyIsGated = (
  gate: Data.ReturnJourneyGate,
): gate is { readonly kind: 'skip'; readonly reason: string } => {
  if (gate.kind === 'ready') {
    return false;
  }

  test.skip(true, gate.reason);
  return true;
};

test('CUJ 17 — submits a return for an eligible Order-Management-managed item quantity', async ({
  page,
  request,
}) => {
  const { access_token: accessToken } = await getGuestToken(request);
  const availability = await probeOmsAvailability(request, accessToken);
  const gate = Data.returnJourneyGate(availability, seededOmsOrderNumber('return'));
  if (skipWhenReturnJourneyIsGated(gate)) {
    return;
  }

  const order = await readOmsExpandedOrder(request, gate.orderNo, accessToken);
  const selection = Data.returnSelection(order, gate.metadata);

  await test.step('Open eligible OMS order', async () => {
    await Actions.openOmsOrder(page, gate.orderNo);
    await expect(page).toHaveURL(buildPath(`/account/orders/${gate.orderNo}`));
  });

  await test.step('Start return/select items', async () => {
    await Actions.startReturn(page);
    await expect(Locators.returnModal(page)).toBeVisible();
    await Actions.selectReturnItem(page, selection.itemName);
    await expect(Locators.returnItemCheckbox(page, selection.itemName)).toBeChecked();
  });

  await test.step('Choose valid quantity/reason', async () => {
    await Actions.setReturnQuantity(
      page,
      selection.itemName,
      Data.quantityText(selection.returnableQuantity),
    );
    await Actions.selectReturnReason(page, selection.reason);
    await expect(Locators.returnQuantityInput(page, selection.itemName)).toHaveValue(
      Data.quantityText(selection.returnableQuantity),
    );
    await expect(Locators.returnReasonSelect(page)).toHaveValue(selection.reason);
  });

  await test.step('Review/submit return', async () => {
    await Actions.reviewReturn(page);
    await expect(Locators.reviewReturnHeading(page)).toBeVisible();
    await expect(Locators.submitReturnButton(page)).toBeVisible();
    await Actions.submitReturn(page);
  });

  await test.step('SOM validates/creates return', async () => {
    await expect(Locators.returnSubmittedStatus(page)).toBeVisible();
  });

  await test.step('View refreshed return state', async () => {
    await Actions.refreshOmsOrder(page);
    await expect(page).toHaveURL(buildPath(`/account/orders/${gate.orderNo}`));
    await expect(Locators.returnRecordedStatus(page)).toBeVisible();
  });
});

test('CUJ 17 — refuses an over-returnable quantity in the return form before submission', async ({
  page,
  request,
}) => {
  test.info().annotations.push({
    type: 'coverage-gap',
    description: Data.returnCoverageGapDescription,
  });
  const { access_token: accessToken } = await getGuestToken(request);
  const availability = await probeOmsAvailability(request, accessToken);
  const gate = Data.returnJourneyGate(availability, seededOmsOrderNumber('return'));
  if (skipWhenReturnJourneyIsGated(gate)) {
    return;
  }

  const order = await readOmsExpandedOrder(request, gate.orderNo, accessToken);
  const selection = Data.returnSelection(order, gate.metadata);
  const requestedQuantity = Data.quantityAboveReturnable(selection.returnableQuantity);

  await Actions.openOmsOrder(page, gate.orderNo);
  await Actions.startReturn(page);
  await Actions.selectReturnItem(page, selection.itemName);
  await Actions.setReturnQuantity(page, selection.itemName, Data.quantityText(requestedQuantity));
  await Actions.selectReturnReason(page, selection.reason);
  await Actions.reviewReturn(page);

  await expect(Locators.returnModal(page)).toBeVisible();
  await expect(Locators.returnQuantityInput(page, selection.itemName)).toHaveValue(
    Data.quantityText(requestedQuantity),
  );
});

test('CUJ 17 — exposes no return action on an order Order Management has not ingested', async ({
  page,
  request,
}) => {
  await Actions.visitStorefront(page);
  const { access_token: accessToken } = await getGuestToken(request);
  const availability = await probeOmsAvailability(request, accessToken);
  if (availability.kind === 'active') {
    throw new Error('CUJ 17 complement requires Order Management to be inactive');
  }

  expect(availability.fault.type).toMatch(/\/oms-not-active$/);
});
