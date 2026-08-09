/**
 * Latent One Click path: authored for a One-Click-enabled deployment with a seeded OTP. The public
 * demo does not meet those prerequisites, so the gated body remains unproven here.
 */
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { env } from '../../../config/env';
import { readAppConfiguration } from '../../support/app-config';
import { evaluateOneClickCheckoutGate, formatGateSkipReason } from '../../support/gates';
import { findOrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type { Basket, Customer, Order, ShippingMethodResult } from '../../support/scapi-types';
import {
  getGuestToken,
  loginRegisteredShopper,
  requireAuthenticatedShopper,
} from '../../support/slas';
import * as Actions from './one-click-first-time.actions';
import {
  basketIdFrom,
  basketPaymentInstrumentFor,
  checkoutInputFor,
  createFirstTimeShopper,
  customerPaymentInstrumentRequest,
  customerRegistrationFor,
  expected,
  orderNoFrom,
  orderRequestFor,
  otpRequestFor,
  otpVerificationFor,
  registeredCheckoutInputFor,
  shipmentIdFrom,
  shippingMethodInput,
  type CheckoutInput,
} from './one-click-first-time.data';

const basketFrom = async (response: APIResponse): Promise<Basket> => {
  expect(response.status()).toBe(expected.successStatus);
  return (await response.json()) as Basket;
};

const prepareOrderReadyBasket = async (
  request: APIRequestContext,
  accessToken: string,
  checkout: CheckoutInput,
): Promise<Basket> => {
  const created = await basketFrom(await Actions.createBasket(request, accessToken));
  const basketId = basketIdFrom(created);
  const withItem = await basketFrom(
    await Actions.addBasketItem(request, accessToken, { basketId, body: checkout.items }),
  );
  const shipmentId = shipmentIdFrom(withItem);
  await basketFrom(
    await Actions.provideContact(request, accessToken, { basketId, body: checkout.customer }),
  );
  await basketFrom(
    await Actions.provideShippingAddress(request, accessToken, {
      basketId,
      body: checkout.shippingAddress,
      shipmentId,
    }),
  );
  const methodsResponse = await Actions.readShippingMethods(request, accessToken, {
    basketId,
    shipmentId,
  });
  expect(methodsResponse.status()).toBe(expected.successStatus);
  const methods = (await methodsResponse.json()) as ShippingMethodResult;
  return basketFrom(
    await Actions.selectShippingMethod(
      request,
      accessToken,
      shippingMethodInput(basketId, shipmentId, methods),
    ),
  );
};

test('CUJ 5 — creates registered customer state and completes a One Click purchase', async ({
  request,
}) => {
  test.info().annotations.push(
    {
      type: 'coverage-gap',
      description:
        'CUJ 5 pain row 2: registration/auth transition failure cannot be provoked because SCAPI mocking is prohibited; SCAPI is the system under test.',
    },
    {
      type: 'coverage-gap',
      description:
        'CUJ 5 pain row 4: saved payment persistence failure cannot be provoked because SCAPI mocking is prohibited; SCAPI is the system under test.',
    },
    {
      type: 'coverage-gap',
      description:
        'CUJ 5 pain row 5: order creation failure with retained checkout data cannot be provoked because SCAPI mocking is prohibited; SCAPI is the system under test.',
    },
  );
  const app = await readAppConfiguration(request);
  const gate = evaluateOneClickCheckoutGate(app);
  if (!gate.met) {
    test.skip(true, formatGateSkipReason(gate));
    return;
  }

  const guest = await getGuestToken(request);
  const shopper = createFirstTimeShopper();
  const otp = required(env.E2E_ONE_CLICK_OTP, 'E2E_ONE_CLICK_OTP');

  await test.step('Enter/verify identity', async () => {
    const requestResponse = await Actions.requestOtp(
      request,
      guest.access_token,
      otpRequestFor(shopper),
    );
    expect(requestResponse.status()).toBe(expected.otpRequestStatus);

    const verificationResponse = await Actions.verifyOtp(
      request,
      guest.access_token,
      otpVerificationFor(shopper, otp),
    );
    expect(verificationResponse.status()).toBe(expected.otpVerificationStatus);
  });

  const authenticated = await test.step('Establish customer/account state', async () => {
    const customerResponse = await Actions.registerCustomer(
      request,
      guest.access_token,
      customerRegistrationFor(shopper),
    );
    expect(customerResponse.status()).toBe(expected.successStatus);
    const customer = (await customerResponse.json()) as Customer;
    expect(customer.customerId).toEqual(expect.any(String));

    const login = await loginRegisteredShopper(request, shopper.email, shopper.password);
    expect(login.status).toBe(expected.loginStatus);
    const session = requireAuthenticatedShopper(login);
    expect(session.customerId).toBe(required(customer.customerId, 'customer.customerId'));
    expect(session.accessToken).toEqual(expect.any(String));
    return session;
  });

  const basket = await test.step('Supply shipping details', async () => {
    const product = await findOrderableVariant(request, authenticated.accessToken);
    const prepared = await prepareOrderReadyBasket(
      request,
      authenticated.accessToken,
      registeredCheckoutInputFor(product, shopper),
    );
    expect(prepared.productItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productId: product.variantId, quantity: 1 }),
      ]),
    );
    expect(prepared.shipments?.[0]?.shippingMethod?.id).toBeTruthy();
    return prepared;
  });

  const paidBasket = await test.step('Supply/save payment', async () => {
    const basketId = basketIdFrom(basket);
    const basketResponse = await Actions.providePayment(request, authenticated.accessToken, {
      basketId,
      body: basketPaymentInstrumentFor(basket),
    });
    const paid = await basketFrom(basketResponse);
    expect(paid.paymentInstruments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ paymentMethodId: expected.paymentMethodId }),
      ]),
    );

    const profileResponse = await Actions.persistCustomerPayment(
      request,
      authenticated.accessToken,
      {
        body: customerPaymentInstrumentRequest,
        customerId: authenticated.customerId,
      },
    );
    expect
      .soft(profileResponse.status(), 'save-for-next-time customer profile persistence')
      .toBe(expected.successStatus);
    return paid;
  });

  const order = await test.step('Create order', async () => {
    const response = await Actions.createOrder(
      request,
      authenticated.accessToken,
      orderRequestFor(basketIdFrom(paidBasket)),
    );
    expect(response.status()).toBe(expected.successStatus);
    const created = (await response.json()) as Order;
    expect(created.status).toBe(expected.orderStatus);
    expect(orderNoFrom(created)).toMatch(expected.orderNumberPattern);
    return created;
  });

  await test.step('Receive confirmation', async () => {
    const orderNo = orderNoFrom(order);
    const response = await Actions.readOrder(request, authenticated.accessToken, orderNo);
    expect(response.status()).toBe(expected.successStatus);
    const confirmed = (await response.json()) as Order;
    expect(confirmed.status).toBe(expected.orderStatus);
    expect(confirmed.orderNo).toBe(orderNo);
  });
});

test('CUJ 5 — separates customer creation from order readiness', async ({ request }) => {
  const customerToken = await getGuestToken(request);
  const shopper = createFirstTimeShopper();
  const customerResponse = await Actions.registerCustomer(
    request,
    customerToken.access_token,
    customerRegistrationFor(shopper),
  );
  expect(customerResponse.status()).toBe(expected.successStatus);
  const customer = (await customerResponse.json()) as Customer;
  expect(customer.customerId).toEqual(expect.any(String));

  const checkoutToken = await getGuestToken(request);
  const product = await findOrderableVariant(request, checkoutToken.access_token);
  const basket = await prepareOrderReadyBasket(
    request,
    checkoutToken.access_token,
    checkoutInputFor(product),
  );
  expect(basket.productItems).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ productId: product.variantId, quantity: 1 }),
    ]),
  );
  expect(basket.shipments?.[0]?.shippingMethod?.id).toBeTruthy();
});
