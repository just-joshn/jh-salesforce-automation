import { expect, test } from '@playwright/test';

import { readAppConfiguration } from '../../support/app-config';
import { evaluateExpressCheckoutGate, formatGateSkipReason } from '../../support/gates';
import { findOrderableVariant } from '../../support/products';
import type { Basket, Order } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import * as Actions from './express-checkout.actions';
import * as Data from './express-checkout.data';

test('CUJ 3 — completes a purchase through Express Checkout', async ({ request }) => {
  test.info().annotations.push(
    {
      type: 'layer-scope',
      description:
        'CUJ 3 step 1 "Invoke express payment" occurs at the express-payment provider surface; the browser layer covers the storefront entry point.',
    },
    {
      type: 'layer-scope',
      description:
        'CUJ 3 step 2 "Authorize with provider" occurs at the express-payment provider surface; the browser layer covers the storefront handoff entry point.',
    },
    {
      type: 'layer-scope',
      description:
        'CUJ 3 step 5 "Process/confirm payment" has no Shopper SCAPI confirmation operation. Shopper Orders can attach payment details, but confirmation occurs through the Salesforce Payments SDK or PSP, and payment-status updates require the Admin Orders API.',
    },
    {
      type: 'coverage-gap',
      description:
        'CUJ 3 pain rows 2, 3, and 5 require provider-authorization failure, shipping invalidation, or payment-recovery failure injection. They cannot be induced because SCAPI is the system under test and mocking it is prohibited.',
    },
  );

  const app = await readAppConfiguration(request);
  const gate = await evaluateExpressCheckoutGate(app, request);
  test.skip(!gate.met, formatGateSkipReason(gate));

  const token = await getGuestToken(request);
  const product = await findOrderableVariant(request, token.access_token);
  const checkout = Data.createCheckoutInput(product);

  const prepared = await test.step('Prepare basket/address/shipping', async () => {
    const result = await Actions.prepareOrderReadyBasket(request, token.access_token, checkout);

    expect(result.basket.productItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productId: product.variantId, quantity: 1 }),
      ]),
    );
    expect(Data.shippingAddressFrom(result.basket)).toEqual(
      expect.objectContaining({
        address1: checkout.shippingAddress.address1,
        postalCode: checkout.shippingAddress.postalCode,
      }),
    );
    expect(Data.selectedShippingMethodIdFrom(result.basket)).toBeTruthy();
    return result;
  });

  const created = await test.step('Create order', async () => {
    const paymentResponse = await Actions.providePayment(request, token.access_token, {
      basketId: prepared.basketId,
      body: Data.paymentInstrumentFor(prepared.basket),
    });
    expect(paymentResponse.status()).toBe(Data.expected.basketMutationStatus);
    const basketWithPayment = (await paymentResponse.json()) as Basket;
    expect(basketWithPayment.paymentInstruments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ paymentMethodId: Data.expected.paymentMethodId }),
      ]),
    );

    const orderResponse = await Actions.createOrder(
      request,
      token.access_token,
      Data.orderRequestFor(prepared.basketId),
    );
    expect(orderResponse.status()).toBe(Data.expected.createOrderStatus);
    const order = (await orderResponse.json()) as Order;
    const orderNo = Data.orderNumberFrom(order);
    expect(order.status).toBe(Data.expected.orderStatus);
    expect(orderNo).toMatch(Data.expected.orderNumberPattern);
    return { orderNo };
  });

  await test.step('Reach confirmation', async () => {
    const response = await Actions.readOrder(request, token.access_token, created.orderNo);
    expect(response.status()).toBe(Data.expected.orderReadStatus);
    const confirmedOrder = (await response.json()) as Order;
    expect(confirmedOrder.status).toBe(Data.expected.orderStatus);
    expect(confirmedOrder.orderNo).toBe(created.orderNo);
    expect(confirmedOrder.orderNo).toMatch(Data.expected.orderNumberPattern);
  });
});

test('CUJ 3 — drives a basket to an order-ready state without an express provider', async ({
  request,
}) => {
  const token = await getGuestToken(request);
  const product = await findOrderableVariant(request, token.access_token);
  const checkout = Data.createCheckoutInput(product);
  const prepared = await Actions.prepareOrderReadyBasket(request, token.access_token, checkout);

  expect(prepared.basket.productItems).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ productId: product.variantId, quantity: 1 }),
    ]),
  );
  expect(Data.shippingAddressFrom(prepared.basket)).toEqual(
    expect.objectContaining({
      address1: checkout.shippingAddress.address1,
      postalCode: checkout.shippingAddress.postalCode,
    }),
  );
  expect(Data.selectedShippingMethodIdFrom(prepared.basket)).toBeTruthy();
});
