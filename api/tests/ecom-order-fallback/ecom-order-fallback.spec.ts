import { expect, test } from '@playwright/test';
import { orderExpand } from '../../support/oms';
import { required } from '../../support/scapi';
import type { Basket, Order } from '../../support/scapi-types';
import { getGuestToken, requireSession } from '../../support/slas';
import * as Actions from './ecom-order-fallback.actions';
import {
  carrierTrackingUrls,
  credentials,
  ecomFallbackCondition,
  firstShipment,
  fulfillmentName,
  itemsWithOmsState,
  omsShipments,
  orderAddress,
  orderableVariant,
  orderProductName,
} from './ecom-order-fallback.data';

const expectStatus = async (response: Promise<{ status(): number }>) =>
  expect((await response).status()).toBe(200);

test('an order Order Management has not ingested exposes no OMS actions', async ({ request }) => {
  test.setTimeout(300000);
  const condition = await ecomFallbackCondition(request);
  test.skip(!condition.met, condition.reason);

  const shopper = credentials();
  const { accessToken: guestToken } = await getGuestToken(request);
  await expectStatus(Actions.registerCustomer(request, guestToken, shopper, orderAddress));
  const { accessToken } = requireSession(await Actions.signIn(request, shopper), shopper.email);
  const variant = await orderableVariant(request, accessToken);
  const created = await Actions.createBasket(request, accessToken);
  expect(created.status()).toBe(200);
  const basketId = required(((await created.json()) as Basket).basketId, 'basketId');
  await expectStatus(Actions.addItem(request, accessToken, basketId, variant.variantId));
  await expectStatus(Actions.setCustomer(request, accessToken, basketId, shopper.email));
  await expectStatus(Actions.setShippingAddress(request, accessToken, basketId, orderAddress));
  await expectStatus(Actions.setShippingMethod(request, accessToken, basketId));
  await expectStatus(Actions.setBillingAddress(request, accessToken, basketId, orderAddress));
  const priced = await Actions.getBasket(request, accessToken, basketId);
  expect(priced.status()).toBe(200);
  const amount = required(((await priced.json()) as Basket).orderTotal, 'orderTotal');
  await expectStatus(Actions.addPayment(request, accessToken, basketId, amount));
  const placed = await Actions.placeOrder(request, accessToken, basketId);
  expect(placed.status()).toBe(200);
  const placedOrder = (await placed.json()) as Order;

  const orderNo = required(placedOrder.orderNo, 'orderNo');
  const detail = await Actions.getOrder(request, accessToken, orderNo);
  expect(detail.status()).toBe(200);
  expect(orderExpand.split(',').map((value) => value.trim())).toEqual(['oms', 'oms_shipments']);
  const order = (await detail.json()) as Order;
  expect(order.omsData).toBeUndefined();
  expect(itemsWithOmsState(order)).toBe(0);

  // Replaces absent actions block, Track Shipment, Cancel Order, and Return Items controls:
  // payload carries no order-level or line-level OMS state from which those actions can be built.
  expect(order.omsData).toBeUndefined();
  expect(itemsWithOmsState(order)).toBe(0);
  // Replaces absent carrier link and zero OMS-only browser calls.
  expect(omsShipments(order)).toBeUndefined();
  expect(carrierTrackingUrls(order)).toHaveLength(0);

  expect(order.status).toBe(placedOrder.status);
  expect(firstShipment(order).shippingStatus).toBe(firstShipment(placedOrder).shippingStatus);
  expect(fulfillmentName(order)).toBe(fulfillmentName(placedOrder));
  expect(orderProductName(order)).toBe(orderProductName(placedOrder));
});
