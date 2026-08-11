import type { APIResponse } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { readAppConfiguration } from '../../support/app-config';
import { evaluateSalesforcePaymentsGate, formatGateSkipReason } from '../../support/gates';
import type { Basket, Order } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import * as Actions from './salesforce-payments.actions';
import type { PaymentReadyCheckout } from './salesforce-payments.actions';
import {
  basketPaymentInstrumentFor,
  expected,
  isEnabled,
  orderNoFrom,
  orderPaymentInstrumentFor,
  orderRequestFor,
  paymentInstrumentFrom,
  paymentInstrumentIdFrom,
  salesforcePaymentsMethodIdFrom,
  type PaymentMethodResult,
  type ShopperConfigurationsResponse,
} from './salesforce-payments.data';

const expectBasket = async (response: APIResponse): Promise<Basket> => {
  expect(response.status()).toBe(expected.basketMutationStatus);
  return (await response.json()) as Basket;
};

const expectOrder = async (response: APIResponse): Promise<Order> => {
  expect(response.status()).toBe(expected.successStatus);
  return (await response.json()) as Order;
};

test('CUJ 2 — completes payment-backed checkout through Salesforce Payments', async ({
  request,
}) => {
  test.info().annotations.push(
    {
      type: 'layer-scope',
      description:
        '"Supply/approve payment data" is PSP-side and has no SCAPI analogue; the browser layer covers it.',
    },
    {
      type: 'coverage-gap',
      description:
        'CUJ 2 pain rows 3 and 5 (PSP decline and post-order payment-update failure) cannot be induced because SCAPI is the system under test and mocking it is prohibited by AGENTS.md.',
    },
  );
  const app = await readAppConfiguration(request);
  const gate = await evaluateSalesforcePaymentsGate(app, request);
  test.skip(!gate.met, formatGateSkipReason(gate));

  const token = await getGuestToken(request);
  const paymentReady =
    await test.step('Reach payment-ready checkout', async (): Promise<PaymentReadyCheckout> => {
      const ready = await Actions.preparePaymentReadyCheckout(request, token.access_token);
      expect(ready.basket.productItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ productId: ready.productVariantId, quantity: 1 }),
        ]),
      );
      expect(ready.basket.customerInfo?.email).toBe(ready.customerEmail);
      expect(ready.basket.billingAddress).toEqual(
        expect.objectContaining({
          address1: ready.shippingAddress1,
          postalCode: ready.shippingPostalCode,
        }),
      );
      expect(ready.basket.shipments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            shippingAddress: expect.objectContaining({
              address1: ready.shippingAddress1,
              postalCode: ready.shippingPostalCode,
            }),
            shippingMethod: expect.objectContaining({ id: ready.shippingMethodId }),
          }),
        ]),
      );
      expect(ready.basket.orderTotal).toBeGreaterThan(0);
      return ready;
    });

  const paymentMethodId = await test.step('Load/select payment method', async () => {
    const methodsResponse = await Actions.getPaymentMethods(
      request,
      token.access_token,
      paymentReady.basketId,
    );
    expect(methodsResponse.status()).toBe(expected.successStatus);
    const methods = (await methodsResponse.json()) as PaymentMethodResult;
    const selectedMethodId = salesforcePaymentsMethodIdFrom(methods);
    expect(selectedMethodId).toBe(expected.paymentMethodId);

    const basket = await expectBasket(
      await Actions.selectPaymentMethod(request, token.access_token, {
        basketId: paymentReady.basketId,
        body: basketPaymentInstrumentFor(paymentReady.basket, selectedMethodId),
      }),
    );
    expect(basket.paymentInstruments).toEqual(
      expect.arrayContaining([expect.objectContaining({ paymentMethodId: selectedMethodId })]),
    );
    return selectedMethodId;
  });

  const createdOrder = await test.step('Create Commerce order', async () => {
    const order = await expectOrder(
      await Actions.createOrder(
        request,
        token.access_token,
        orderRequestFor(paymentReady.basketId),
      ),
    );
    expect(order.status).toBe(expected.orderStatus);
    expect(orderNoFrom(order)).toMatch(expected.orderNumberPattern);
    expect(paymentInstrumentIdFrom(order, paymentMethodId)).toBeTruthy();
    return order;
  });

  const paidOrder = await test.step('Attach/confirm payment on order', async () => {
    const orderNo = orderNoFrom(createdOrder);
    const paymentInstrumentId = paymentInstrumentIdFrom(createdOrder, paymentMethodId);
    const order = await expectOrder(
      await Actions.updateOrderPaymentInstrument(request, token.access_token, {
        body: orderPaymentInstrumentFor(createdOrder, paymentMethodId),
        orderNo,
        paymentInstrumentId,
      }),
    );
    const paymentInstrument = paymentInstrumentFrom(order, paymentMethodId);
    expect(orderNoFrom(order)).toBe(orderNo);
    expect(paymentInstrument.paymentInstrumentId).toBe(paymentInstrumentId);
    expect(paymentInstrument.paymentReference?.paymentReferenceId).toBeTruthy();
    return order;
  });

  await test.step('Reach confirmation', async () => {
    const orderNo = orderNoFrom(paidOrder);
    const response = await Actions.readOrder(request, token.access_token, orderNo);
    const order = await expectOrder(response);
    const paymentInstrument = paymentInstrumentFrom(order, paymentMethodId);
    expect(order.status).toBe(expected.orderStatus);
    expect(orderNoFrom(order)).toBe(orderNo);
    expect(order.orderNo).toMatch(expected.orderNumberPattern);
    expect(paymentInstrument.paymentReference?.paymentReferenceId).toBeTruthy();
  });
});

test('CUJ 2 — reports Salesforce Payments as unavailable through Shopper Configurations', async ({
  request,
}) => {
  const token = await getGuestToken(request);
  const response = await Actions.readShopperConfigurations(request, token.access_token);
  expect(response.status()).toBe(expected.successStatus);
  const payload = (await response.json()) as ShopperConfigurationsResponse;
  const setting = payload.configurations.find(
    ({ id }) => id === expected.salesforcePaymentsAllowedId,
  );

  expect(setting).toBeDefined();
  expect(isEnabled(setting?.value)).toBe(false);
});
