import { expect, test } from '@playwright/test';
import { findOrderableVariants } from '../../support/products';
import { getGuestToken, requireSession } from '../../support/slas';
import * as Actions from './orders.actions';
import type { OrderDetail, OrderHistory } from './orders.data';
import { masterId, ordersOf, password, uniqueEmail, unknownOrderNo } from './orders.data';

// Order history and detail stay consistent, and one shopper can't read another's orders.
test('order history and detail are correct, consistent, and access-controlled', async ({
  request,
}) => {
  // shopper A: one order
  const accountA = { email: uniqueEmail(), password };
  const { accessToken: guestA } = await getGuestToken(request);
  expect((await Actions.registerCustomer(request, guestA, accountA)).status()).toBe(200);
  const loginA = await Actions.signIn(request, accountA.email, accountA.password);
  expect(loginA.loginStatus).toBe(303);
  const { accessToken: tokenA, customerId: customerIdA } = requireSession(loginA, 'customer A');
  // Order a variant that is in stock right now; a hardcoded one would go stale as stock sells out.
  const [variant] = await findOrderableVariants(request, tokenA, { masterId, minCount: 1 });
  if (!variant) throw new Error('expected an orderable variant');
  const orderNo = await Actions.placeOrder(request, tokenA, accountA.email, variant.variantId);
  expect(orderNo).toBeTruthy();

  // A's history includes the order, with status and total
  const historyResponse = await Actions.getCustomerOrders(request, tokenA, customerIdA);
  expect(historyResponse.status()).toBe(200);
  const history = (await historyResponse.json()) as OrderHistory;
  expect(history.total).toBeGreaterThan(0);
  const summary = ordersOf(history).find((entry) => entry.orderNo === orderNo);
  if (!summary) throw new Error('the placed order is missing from the order history');
  expect(summary.status).toBeTruthy();
  expect(typeof summary.orderTotal).toBe('number');

  // detail matches the history summary
  const detailResponse = await Actions.getOrder(request, tokenA, orderNo);
  expect(detailResponse.status()).toBe(200);
  const detail = (await detailResponse.json()) as OrderDetail;
  expect(detail.orderNo).toBe(orderNo);
  expect(detail.orderTotal).toBe(summary.orderTotal);

  // shopper B: no orders, so an empty list
  const accountB = { email: uniqueEmail(), password };
  const { accessToken: guestB } = await getGuestToken(request);
  expect((await Actions.registerCustomer(request, guestB, accountB)).status()).toBe(200);
  const loginB = await Actions.signIn(request, accountB.email, accountB.password);
  const { accessToken: tokenB, customerId: customerIdB } = requireSession(loginB, 'customer B');
  const emptyResponse = await Actions.getCustomerOrders(request, tokenB, customerIdB);
  expect(emptyResponse.status()).toBe(200);
  expect(((await emptyResponse.json()) as OrderHistory).total).toBe(0);

  // an unknown order number returns 404
  expect((await Actions.getOrder(request, tokenA, unknownOrderNo)).status()).toBe(404);

  // B can't read A's orders (list blocked, single order 404)
  expect((await Actions.getCustomerOrders(request, tokenB, customerIdA)).status()).toBe(400);
  expect((await Actions.getOrder(request, tokenB, orderNo)).status()).toBe(404);
});
