import { expect, test } from '@playwright/test';
import { orderExpand, type OrderResource } from '../../support/oms';
import * as Actions from './return-oms-items.actions';
import {
  defaultReason,
  faultType,
  intendedLine,
  returnableFrom,
  returnBody,
  returnItemsCondition,
} from './return-oms-items.data';

test('a registered shopper returns eligible items from an OMS order', async ({ request }) => {
  test.setTimeout(300000);

  const condition = await returnItemsCondition(request);
  test.skip(!condition.met, condition.reason);

  const orderResponse = await Actions.openOrder(request, condition.accessToken, condition.orderNo);
  expect(orderResponse.status()).toBe(200);
  expect(orderExpand.split(',').map((value) => value.trim())).toEqual(['oms', 'oms_shipments']);
  const order = (await orderResponse.json()) as OrderResource;
  expect(order.orderNo).toBe(condition.orderNo);

  // Replaces enabled Return Items control and modal rows: only lines carrying a
  // positive OMS quantityAvailableToReturn are offered, each with its own limit.
  expect(returnableFrom(order)).toEqual(condition.returnable);
  const line = intendedLine(condition);

  // Selection/reason gating and review controls are browser-only. API requires
  // one productItems entry; reason comes from OMS metadata's preselected default.
  const preselected = defaultReason(condition.reasonCodes);
  expect(preselected).not.toBe('');

  // Replaces form clamping with stronger service guard: quantity above reported
  // OMS limit must be refused as return-quantity-exceeded.
  const excessive = returnBody(line, line.availableToReturn + 1, preselected);
  const refused = await Actions.returnOrder(
    request,
    condition.accessToken,
    condition.orderNo,
    excessive,
  );
  expect(refused.status()).toBe(400);
  expect(await faultType(refused)).toContain('return-quantity-exceeded');

  const acceptedBody = returnBody(line, line.availableToReturn, preselected);
  expect(acceptedBody.productItems).toEqual([
    { itemId: line.itemId, quantity: line.availableToReturn, reason: preselected },
  ]);
  const accepted = await Actions.returnOrder(
    request,
    condition.accessToken,
    condition.orderNo,
    acceptedBody,
  );
  expect(accepted.status()).toBe(200);
  const acknowledged = (await accepted.json()) as OrderResource;
  expect(acknowledged.orderNo).toBe(condition.orderNo);

  // Stale-quantity and unknown-item 400 recoveries remain explicit non-goals:
  // forcing them requires faking Order Management, service under test.
});
