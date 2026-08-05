import { expect, test } from '@playwright/test';
import { getGuestToken, requireSession } from '../../support/slas';
import * as Actions from './orders.actions';
import type { OrderDetail, OrderHistory } from './orders.data';
import { orderableVariant, ordersOf, registrant, uniqueEmail, unknownOrderNo } from './orders.data';

// Orders match; shoppers can't see each other's.
test('order history and detail are correct, consistent, and access-controlled', async ({
  request,
}) => {
  // Shopper A places one order.
  const accountA = registrant(uniqueEmail());
  const { accessToken: guestA } = await getGuestToken(request);
  expect((await Actions.registerCustomer(request, guestA, accountA)).status()).toBe(200);
  const loginA = await Actions.signIn(request, accountA.email, accountA.password);
  expect(loginA.loginStatus).toBe(303);
  const { accessToken: tokenA, customerId: customerIdA } = requireSession(loginA, 'customer A');
  const variant = await orderableVariant(request, tokenA);
  const orderNo = await Actions.placeOrder(request, tokenA, accountA.email, variant.variantId);
  expect(orderNo).toBeTruthy();

  // A sees the order, status, total.
  const historyResponse = await Actions.getCustomerOrders(request, tokenA, customerIdA);
  expect(historyResponse.status()).toBe(200);
  const history = (await historyResponse.json()) as OrderHistory;
  expect(history.total).toBeGreaterThan(0);
  const summary = ordersOf(history).find((entry) => entry.orderNo === orderNo);
  if (!summary) throw new Error('the placed order is missing from the order history');
  expect(summary.status).toBeTruthy();
  expect(typeof summary.orderTotal).toBe('number');

  // Order detail matches the list.
  const detailResponse = await Actions.getOrder(request, tokenA, orderNo);
  expect(detailResponse.status()).toBe(200);
  const detail = (await detailResponse.json()) as OrderDetail;
  expect(detail.orderNo).toBe(orderNo);
  expect(detail.orderTotal).toBe(summary.orderTotal);

  // Shopper B has no orders.
  const accountB = registrant(uniqueEmail());
  const { accessToken: guestB } = await getGuestToken(request);
  expect((await Actions.registerCustomer(request, guestB, accountB)).status()).toBe(200);
  const loginB = await Actions.signIn(request, accountB.email, accountB.password);
  const { accessToken: tokenB, customerId: customerIdB } = requireSession(loginB, 'customer B');
  const emptyResponse = await Actions.getCustomerOrders(request, tokenB, customerIdB);
  expect(emptyResponse.status()).toBe(200);
  expect(((await emptyResponse.json()) as OrderHistory).total).toBe(0);

  // Unknown order → 404.
  expect((await Actions.getOrder(request, tokenA, unknownOrderNo)).status()).toBe(404);

  // B cannot see A's orders.
  expect((await Actions.getCustomerOrders(request, tokenB, customerIdA)).status()).toBe(400);
  expect((await Actions.getOrder(request, tokenB, orderNo)).status()).toBe(404);
});
