import { expect, test } from '@playwright/test';
import { orderExpand, type OrderResource } from '../../support/oms';
import * as Actions from './cancel-oms-order.actions';
import {
  cancellationBody,
  cancelOrderCondition,
  defaultReason,
  isCancellable,
} from './cancel-oms-order.data';

test('a registered shopper cancels an eligible OMS order', async ({ request }) => {
  test.setTimeout(300000);

  const condition = await cancelOrderCondition(request);
  test.skip(!condition.met, condition.reason);

  const beforeResponse = await Actions.openOrder(request, condition.accessToken, condition.orderNo);
  expect(beforeResponse.status()).toBe(200);
  expect(orderExpand.split(',').map((value) => value.trim())).toEqual(['oms', 'oms_shipments']);
  const before = (await beforeResponse.json()) as OrderResource;
  expect(before.orderNo).toBe(condition.orderNo);

  // Replaces visible enabled Cancel Order control: strict numeric eligibility
  // requires every line's quantityAvailableToCancel to equal quantityOrdered.
  expect(isCancellable(before)).toBe(true);

  // Cancel modal impact text, Keep Order, and button states are browser-only.
  const preselected = defaultReason(condition.reasonCodes);
  expect(condition.reasonCodes.find((code) => code.default === true)?.reason ?? '').toBe(
    preselected,
  );
  const body = cancellationBody(preselected);

  const cancellation = await Actions.cancelOrder(
    request,
    condition.accessToken,
    condition.orderNo,
    body,
  );
  expect(body.reason).toBe(preselected === '' ? undefined : preselected);
  expect(cancellation.status()).toBe(200);
  const acknowledged = (await cancellation.json()) as OrderResource;
  expect(acknowledged.status).toBe('cancelled');

  const afterResponse = await Actions.openOrder(request, condition.accessToken, condition.orderNo);
  expect(afterResponse.status()).toBe(200);
  const after = (await afterResponse.json()) as OrderResource;
  expect(after.status).toBe('cancelled');

  // Replaces disabled second Cancel Order control: cancelled order is terminal.
  expect(isCancellable(after)).toBe(false);
});
