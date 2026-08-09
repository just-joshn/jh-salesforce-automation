/**
 * LATENT: This One Click path targets a One-Click-enabled deployment with a seeded OTP. The public
 * demo keeps it gated, so the complete path is authored against vendored contracts but unproven here.
 */
import type { APIResponse } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { readAppConfiguration } from '../../support/app-config';
import { evaluateOneClickCheckoutGate, formatGateSkipReason } from '../../support/gates';
import { findOrderableVariant } from '../../support/products';
import { getGuestToken } from '../../support/slas';
import { required } from '../../support/scapi';
import type {
  Basket,
  Customer,
  Order,
  ShippingMethodResult,
  TokenResponse,
} from '../../support/scapi-types';
import * as Actions from './one-click-returning.actions';
import {
  basketItemFor,
  basketPaymentInstrumentFor,
  customerAddressFor,
  customerInfoFor,
  customerPaymentInstrumentFor,
  createReturningShopper,
  customerRegistrationFor,
  defaultShipmentIdFrom,
  expected,
  oneTimeCodeRequestFor,
  oneTimeCodeVerificationFor,
  orderRequestFor,
  savedAddressFrom,
  savedPaymentInstrumentFrom,
  shippingMethodRequestFor,
  shippingMethodIdFrom,
} from './one-click-returning.data';

const basketFrom = async (response: APIResponse): Promise<Basket> => {
  expect(response.status()).toBe(expected.successStatus);
  return (await response.json()) as Basket;
};

test('CUJ 4 — authenticates a returning shopper and completes a One Click order', async ({
  request,
}) => {
  test.setTimeout(120_000);
  const app = await readAppConfiguration(request);
  const gate = evaluateOneClickCheckoutGate(app);
  test.info().annotations.push({
    type: 'coverage-gap',
    description:
      'CUJ 4 pain rows 2 (invalid/expired OTP recovery), 3 (basket transfer failure), and 4 (invalid/outdated saved data) cannot be provoked on this deployment; SCAPI mocking is prohibited because it is the system under test.',
  });
  test.skip(!gate.met, formatGateSkipReason(gate));

  const shopper = createReturningShopper();
  const profileGuest = await getGuestToken(request);
  const registration = await Actions.registerCustomer(
    request,
    profileGuest.access_token,
    customerRegistrationFor(shopper),
  );
  expect(registration.status()).toBe(expected.successStatus);
  const profileSession = await Actions.loginWithGuestUsid(request, shopper, profileGuest.usid);
  const profileAccessToken = required(profileSession.accessToken, 'profile access token');
  const profileCustomerId = required(profileSession.customerId, 'profile customer id');
  const addressResponse = await Actions.createCustomerAddress(request, profileAccessToken, {
    body: customerAddressFor(shopper),
    customerId: profileCustomerId,
  });
  expect(addressResponse.status()).toBe(expected.successStatus);
  const paymentResponse = await Actions.createCustomerPaymentInstrument(
    request,
    profileAccessToken,
    {
      body: customerPaymentInstrumentFor(shopper),
      customerId: profileCustomerId,
    },
  );
  expect(paymentResponse.status()).toBe(expected.successStatus);

  const guest = await getGuestToken(request);
  const product = await findOrderableVariant(request, guest.access_token);
  const guestBasket = await basketFrom(
    await Actions.createGuestBasket(request, guest.access_token),
  );
  const basketWithItem = await basketFrom(
    await Actions.addBasketItem(request, guest.access_token, basketItemFor(guestBasket, product)),
  );

  await test.step('Enter account email/request OTP', async () => {
    const response = await Actions.requestOneTimeCode(
      request,
      oneTimeCodeRequestFor(shopper.email, guest.usid),
    );
    expect(response.status()).toBe(expected.successStatus);
    const acknowledgement: unknown = await response.json();
    expect(acknowledgement).toEqual(expect.any(String));
  });

  const registered = await test.step('Verify OTP', async () => {
    const response = await Actions.verifyOneTimeCode(
      request,
      oneTimeCodeVerificationFor(shopper.email),
    );
    expect(response.status()).toBe(expected.successStatus);
    const token = (await response.json()) as TokenResponse;
    const accessToken = required(token.access_token, 'passwordless access token');
    const customerId = required(token.customer_id, 'passwordless customer id');
    expect(accessToken).toBeTruthy();
    expect(customerId).toBe(profileCustomerId);
    return { accessToken, customerId };
  });

  const transferred = await test.step('Transfer/merge basket', async () => {
    const basket = await basketFrom(
      await Actions.transferGuestBasket(request, registered.accessToken),
    );
    expect(basketWithItem.productItems).toEqual(
      expect.arrayContaining([expect.objectContaining({ productId: product.variantId })]),
    );
    expect(basket.productItems).toEqual(
      expect.arrayContaining([expect.objectContaining({ productId: product.variantId })]),
    );
    return basket;
  });

  const checkout = await test.step('Load/apply saved shipping/payment', async () => {
    const customerResponse = await Actions.readCustomer(request, registered.accessToken, {
      customerId: registered.customerId,
    });
    expect(customerResponse.status()).toBe(expected.successStatus);
    const customer = (await customerResponse.json()) as Customer;
    const savedAddress = savedAddressFrom(customer);
    const savedPayment = savedPaymentInstrumentFrom(customer);
    const basketId = required(transferred.basketId, 'transferred basket.basketId');
    const shipmentId = defaultShipmentIdFrom(transferred);

    await basketFrom(
      await Actions.applyCustomer(request, registered.accessToken, {
        basketId,
        body: customerInfoFor(customer),
      }),
    );
    await basketFrom(
      await Actions.applyShippingAddress(request, registered.accessToken, {
        basketId,
        body: savedAddress,
        shipmentId,
      }),
    );
    const methodsResponse = await Actions.readShippingMethods(request, registered.accessToken, {
      basketId,
      shipmentId,
    });
    expect(methodsResponse.status()).toBe(expected.successStatus);
    const shippingMethodId = shippingMethodIdFrom(
      (await methodsResponse.json()) as ShippingMethodResult,
    );
    const shippedBasket = await basketFrom(
      await Actions.applyShippingMethod(request, registered.accessToken, {
        basketId,
        body: shippingMethodRequestFor(shippingMethodId),
        shipmentId,
      }),
    );
    const paidBasket = await basketFrom(
      await Actions.applyPayment(request, registered.accessToken, {
        basketId,
        body: basketPaymentInstrumentFor(shippedBasket, savedPayment),
      }),
    );

    expect(paidBasket.customerInfo?.customerId).toBe(registered.customerId);
    expect(paidBasket.shipments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          shipmentId,
          shippingAddress: expect.objectContaining({
            address1: savedAddress.address1,
            postalCode: savedAddress.postalCode,
          }),
          shippingMethod: expect.objectContaining({ id: shippingMethodId }),
        }),
      ]),
    );
    expect(paidBasket.billingAddress).toEqual(
      expect.objectContaining({
        address1: savedAddress.address1,
        postalCode: savedAddress.postalCode,
      }),
    );
    expect(paidBasket.paymentInstruments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ paymentMethodId: savedPayment.paymentMethodId }),
      ]),
    );
    return { basketId, paidBasket };
  });

  const placedOrder = await test.step('Place order', async () => {
    const response = await Actions.createOrder(
      request,
      registered.accessToken,
      orderRequestFor(checkout.basketId),
    );
    expect(response.status()).toBe(expected.successStatus);
    const order = (await response.json()) as Order;
    expect(order.status).toBe(expected.orderStatus);
    expect(order.customerInfo?.customerId).toBe(registered.customerId);
    expect(order.orderNo).toMatch(expected.orderNumberPattern);
    return order;
  });

  await test.step('Reach confirmation', async () => {
    const orderNo = required(placedOrder.orderNo, 'placed order.orderNo');
    const response = await Actions.readOrder(request, registered.accessToken, { orderNo });
    expect(response.status()).toBe(expected.successStatus);
    const confirmed = (await response.json()) as Order;
    expect(confirmed.confirmationStatus).toBe(expected.confirmationStatus);
    expect(confirmed.orderNo).toBe(orderNo);
    expect(confirmed.customerInfo?.customerId).toBe(registered.customerId);
  });
});

test('CUJ 4 — preserves a guest basket through registered authentication', async ({ request }) => {
  const guest = await getGuestToken(request);
  const shopper = createReturningShopper();
  const product = await findOrderableVariant(request, guest.access_token);

  const registration = await Actions.registerCustomer(
    request,
    guest.access_token,
    customerRegistrationFor(shopper),
  );
  expect(registration.status()).toBe(expected.successStatus);

  const guestBasket = await basketFrom(
    await Actions.createGuestBasket(request, guest.access_token),
  );
  const basketWithItem = await basketFrom(
    await Actions.addBasketItem(request, guest.access_token, basketItemFor(guestBasket, product)),
  );
  const registered = await Actions.loginWithGuestUsid(request, shopper, guest.usid);
  const transferred = await basketFrom(
    await Actions.transferGuestBasket(request, registered.accessToken),
  );

  expect(basketWithItem.productItems).toEqual(
    expect.arrayContaining([expect.objectContaining({ productId: product.variantId })]),
  );
  expect(transferred.productItems).toEqual(
    expect.arrayContaining([expect.objectContaining({ productId: product.variantId })]),
  );
});
