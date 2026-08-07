import { expect, test } from '@playwright/test';
import { required } from '../../support/scapi';
import type { Basket, Customer, Order } from '../../support/scapi-types';
import { loginRegisteredShopper, requireSession } from '../../support/slas';
import * as Actions from './one-click-checkout.actions';
import {
  deliveryVariant,
  oneClickCondition,
  savedAddressFrom,
  savedDataShopper,
  savedPaymentCard,
  shipmentFrom,
  shipmentId,
  shippingMethodId,
} from './one-click-checkout.data';

// CUJ 18: Complete one-click checkout using saved identity data.
test('a returning shopper places an order through one-click checkout', async ({ request }) => {
  test.setTimeout(300000);

  const condition = await oneClickCondition(request);
  test.skip(!condition.met, condition.reason);

  const shopper = await savedDataShopper(request);
  const variant = await deliveryVariant(request);

  const login = await loginRegisteredShopper(request, shopper.email, shopper.password);
  const { accessToken, customerId } = requireSession(login, shopper.email);

  const createResponse = await Actions.createBasket(request, accessToken);
  expect(createResponse.status()).toBe(200);
  const basketId = required(((await createResponse.json()) as Basket).basketId, 'basketId');
  const addResponse = await Actions.addItem(request, accessToken, basketId, variant.variantId);
  expect(addResponse.status()).toBe(200);

  const savedDataResponse = await Actions.getSavedCheckoutData(request, accessToken, customerId);
  expect(savedDataResponse.status()).toBe(200);
  const savedData = (await savedDataResponse.json()) as Customer;
  expect(savedData.email).toBe(shopper.email);
  expect(savedAddressFrom(savedData)?.address1).toBe(shopper.address.address1);
  expect(Array.isArray(savedData.paymentInstruments ?? [])).toBe(true);

  // Replaces e2e /checkout one-click page, Sign Out, Contact Info, and saved-address rendering:
  // that route and its controls are storefront surfaces with no API endpoint.

  const addressResponse = await Actions.applySavedAddress(
    request,
    accessToken,
    basketId,
    shipmentId,
    shopper.address,
  );
  expect(addressResponse.status()).toBe(200);
  const methodResponse = await Actions.applyShippingMethod(
    request,
    accessToken,
    basketId,
    shipmentId,
    shippingMethodId,
  );
  expect(methodResponse.status()).toBe(200);

  const savedPaymentResponse = await Actions.saveCustomerPaymentInstrument(
    request,
    accessToken,
    customerId,
    savedPaymentCard,
  );
  expect(savedPaymentResponse.status()).toBe(200);

  const pricedResponse = await Actions.getBasket(request, accessToken, basketId);
  expect(pricedResponse.status()).toBe(200);
  const amount = required(((await pricedResponse.json()) as Basket).orderTotal, 'orderTotal');
  const basketPaymentResponse = await Actions.addBasketPaymentInstrument(
    request,
    accessToken,
    basketId,
    savedPaymentCard,
    amount,
  );
  expect(basketPaymentResponse.status()).toBe(200);

  const orderResponse = await Actions.createOrder(request, accessToken, basketId);
  expect(orderResponse.status()).toBe(200);
  const order = (await orderResponse.json()) as Order;
  expect(order.orderNo).toBeTruthy();
  expect(shipmentFrom(order).shippingAddress?.address1).toBe(shopper.address.address1);
});
