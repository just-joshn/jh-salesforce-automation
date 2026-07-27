import { expect, test } from '@playwright/test';
import { findOrderableVariants } from '../../support/products';
import { getGuestToken } from '../../support/slas';
import * as Actions from './checkout-delivery.actions';
import type { Basket, Order } from './checkout-delivery.data';
import {
  checkout,
  lineItems,
  orderNumber,
  orderTotalOf,
  paymentInstrumentsOf,
  shipmentById,
  shippingMethodId,
} from './checkout-delivery.data';

// Guest delivery order, then prove the cart can't order again.
test('place a guest delivery order and consume the basket', async ({ request }) => {
  const { accessToken } = await getGuestToken(request);

  // Order a size that is in stock right now.
  const [variant] = await findOrderableVariants(request, accessToken, {
    masterId: checkout.masterId,
    minCount: 1,
  });
  if (!variant) throw new Error('expected an orderable variant');

  const created = (await (await Actions.createBasket(request, accessToken)).json()) as Basket;
  expect(created.basketId).toBeTruthy();
  const id = created.basketId;

  // Fill each checkout step; each must save.
  expect((await Actions.addItem(request, accessToken, id, variant.variantId, 1)).status()).toBe(
    200,
  );
  expect((await Actions.setCustomer(request, accessToken, id, checkout.email)).status()).toBe(200);
  expect(
    (
      await Actions.setShippingAddress(
        request,
        accessToken,
        id,
        checkout.shipmentId,
        checkout.address,
      )
    ).status(),
  ).toBe(200);
  expect(
    (
      await Actions.setShippingMethod(
        request,
        accessToken,
        id,
        checkout.shipmentId,
        checkout.shippingMethodId,
      )
    ).status(),
  ).toBe(200);
  expect(
    (await Actions.setBillingAddress(request, accessToken, id, checkout.address)).status(),
  ).toBe(200);

  // Pay the exact order total.
  const priced = (await (await Actions.getBasket(request, accessToken, id)).json()) as Basket;
  expect(typeof priced.orderTotal).toBe('number');
  const amount = orderTotalOf(priced);
  expect((await Actions.addPayment(request, accessToken, id, checkout.card, amount)).status()).toBe(
    200,
  );

  // Place the order.
  const orderResponse = await Actions.createOrder(request, accessToken, id);
  expect(orderResponse.status()).toBe(200);
  const order = (await orderResponse.json()) as Order;
  expect(order.orderNo).toBeTruthy();
  expect(order.status).toBe('created');
  expect(lineItems(order).some((item) => item.productId === variant.variantId)).toBe(true);
  const shipment = shipmentById(order, checkout.shipmentId);
  expect(shippingMethodId(shipment)).toBe(checkout.shippingMethodId);
  expect(paymentInstrumentsOf(order).length).toBeGreaterThan(0);
  const orderNo = orderNumber(order);

  // Order can be loaded again after.
  const fetched = await Actions.getOrder(request, accessToken, orderNo);
  expect(fetched.status()).toBe(200);
  expect(((await fetched.json()) as Order).orderNo).toBe(orderNo);

  // After order, cart is gone (404).
  expect((await Actions.getBasket(request, accessToken, id)).status()).toBe(404);

  // Used cart must not make a second order.
  expect((await Actions.createOrder(request, accessToken, id)).ok()).toBe(false);
});
