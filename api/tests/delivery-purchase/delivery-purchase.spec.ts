import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { findOrderableVariant } from '../../support/products';
import { getGuestToken } from '../../support/slas';
import type { Basket, Fault, Order, ShippingMethodResult } from '../../support/scapi-types';
import * as Actions from './delivery-purchase.actions';
import {
  basketIdFrom,
  createCheckoutInput,
  defaultShipmentIdFrom,
  expected,
  orderRequestFor,
  paymentInstrumentFor,
  shippingMethodIdFrom,
  shippingMethodRequestFor,
  type CheckoutInput,
} from './delivery-purchase.data';

// OUT OF SCOPE: Pain rows 1 (availability flips) and 2 (basket-mutation failure) cannot be
// forced against a live store without faking SCAPI, which this suite explicitly bans.

interface PreparedBasket {
  readonly basketId: string;
}

const expectBasket = async (response: APIResponse): Promise<Basket> => {
  expect(response.status()).toBe(expected.basketMutationStatus);
  return (await response.json()) as Basket;
};

const readOrder = async (response: APIResponse): Promise<Order> =>
  (await response.json()) as Order;

const readFault = async (response: APIResponse): Promise<Fault> =>
  (await response.json()) as Fault;

const readShippingMethods = async (response: APIResponse): Promise<ShippingMethodResult> =>
  (await response.json()) as ShippingMethodResult;

const prepareReadyBasket = async (
  request: APIRequestContext,
  accessToken: string,
  checkout: CheckoutInput,
): Promise<PreparedBasket> => {
  const createResponse = await Actions.createBasket(request, accessToken);
  const createdBasket = await expectBasket(createResponse);
  const basketId = basketIdFrom(createdBasket);

  const itemResponse = await Actions.addProductToBasket(request, accessToken, {
    basketId,
    body: checkout.productItems,
  });
  const basketWithItem = await expectBasket(itemResponse);
  const shipmentId = defaultShipmentIdFrom(basketWithItem);

  const contactResponse = await Actions.provideContact(request, accessToken, {
    basketId,
    body: checkout.customer,
  });
  await expectBasket(contactResponse);

  const addressResponse = await Actions.provideShippingAddress(request, accessToken, {
    basketId,
    body: checkout.shippingAddress,
    shipmentId,
  });
  await expectBasket(addressResponse);

  const methodsResponse = await Actions.getShippingMethods(request, accessToken, {
    basketId,
    shipmentId,
  });
  const shippingMethods = await readShippingMethods(methodsResponse);
  expect(methodsResponse.status()).toBe(expected.basketMutationStatus);
  const shippingMethodId = shippingMethodIdFrom(shippingMethods);

  const shippingResponse = await Actions.selectShippingMethod(request, accessToken, {
    basketId,
    body: shippingMethodRequestFor(shippingMethodId),
    shipmentId,
  });
  const basketWithShipping = await expectBasket(shippingResponse);

  const paymentResponse = await Actions.providePayment(request, accessToken, {
    basketId,
    body: paymentInstrumentFor(basketWithShipping),
  });
  await expectBasket(paymentResponse);
  return { basketId };
};

test('CUJ 1 — completes a delivery purchase and receives a confirmed order', async ({ request }) => {
  const token = await getGuestToken(request);
  const product = await findOrderableVariant(request, token.access_token);
  const checkout = createCheckoutInput(product);
  let basketId = '';
  let basket: Basket = {};
  let order: Order = {};

  await test.step('Find/select purchasable product', () => {
    expect(product.availableToSell).toBeGreaterThan(0);
    expect(product.variantId).toBeTruthy();
  });

  await test.step('Add product to basket', async () => {
    const createResponse = await Actions.createBasket(request, token.access_token);
    expect(createResponse.status()).toBe(expected.basketMutationStatus);
    basketId = basketIdFrom((await createResponse.json()) as Basket);

    const itemResponse = await Actions.addProductToBasket(request, token.access_token, {
      basketId,
      body: checkout.productItems,
    });
    expect(itemResponse.status()).toBe(expected.basketMutationStatus);
    basket = (await itemResponse.json()) as Basket;
    expect(basket.productItems).toEqual(
      expect.arrayContaining([expect.objectContaining({ productId: product.variantId, quantity: 1 })]),
    );
  });

  await test.step('Review basket and start checkout', () => {
    expect(basketIdFrom(basket)).toBe(basketId);
    expect(basket.productSubTotal).toBeGreaterThan(0);
  });

  await test.step('Provide valid contact, address, shipping', async () => {
    const shipmentId = defaultShipmentIdFrom(basket);
    const contactResponse = await Actions.provideContact(request, token.access_token, {
      basketId,
      body: checkout.customer,
    });
    expect(contactResponse.status()).toBe(expected.basketMutationStatus);
    await contactResponse.json();

    const addressResponse = await Actions.provideShippingAddress(request, token.access_token, {
      basketId,
      body: checkout.shippingAddress,
      shipmentId,
    });
    expect(addressResponse.status()).toBe(expected.basketMutationStatus);
    await addressResponse.json();

    const methodsResponse = await Actions.getShippingMethods(request, token.access_token, {
      basketId,
      shipmentId,
    });
    expect(methodsResponse.status()).toBe(expected.basketMutationStatus);
    const shippingMethodId = shippingMethodIdFrom(await readShippingMethods(methodsResponse));

    const shippingResponse = await Actions.selectShippingMethod(request, token.access_token, {
      basketId,
      body: shippingMethodRequestFor(shippingMethodId),
      shipmentId,
    });
    expect(shippingResponse.status()).toBe(expected.basketMutationStatus);
    basket = (await shippingResponse.json()) as Basket;
    expect(basket.shipments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          shippingAddress: expect.objectContaining({
            address1: checkout.shippingAddress.address1,
            city: checkout.shippingAddress.city,
            countryCode: checkout.shippingAddress.countryCode,
            postalCode: checkout.shippingAddress.postalCode,
            stateCode: checkout.shippingAddress.stateCode,
          }),
          shippingMethod: expect.objectContaining({ id: shippingMethodId }),
        }),
      ]),
    );
  });

  await test.step('Provide valid payment and place order', async () => {
    const paymentResponse = await Actions.providePayment(request, token.access_token, {
      basketId,
      body: paymentInstrumentFor(basket),
    });
    expect(paymentResponse.status()).toBe(expected.basketMutationStatus);
    const readyBasket = (await paymentResponse.json()) as Basket;
    expect(readyBasket.paymentInstruments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ paymentMethodId: expected.paymentMethodId }),
      ]),
    );

    const orderResponse = await Actions.createOrder(
      request,
      token.access_token,
      orderRequestFor(basketId),
    );
    expect(orderResponse.status()).toBe(expected.createOrderStatus);
    order = await readOrder(orderResponse);
    expect(order.status).toBe(expected.orderStatus);
  });

  await test.step('Receive order confirmation', () => {
    expect(order.orderNo).toMatch(expected.orderNumberPattern);
    console.log(`REAL ORDER NUMBER: ${order.orderNo}`);
  });
});

test('CUJ 1 — refuses to create a second order from a basket already consumed by checkout', async ({
  request,
}) => {
  const token = await getGuestToken(request);
  const product = await findOrderableVariant(request, token.access_token);
  const checkout = createCheckoutInput(product);
  const prepared = await prepareReadyBasket(request, token.access_token, checkout);
  const orderRequest = orderRequestFor(prepared.basketId);

  const firstResponse = await Actions.createOrder(request, token.access_token, orderRequest);
  expect(firstResponse.status()).toBe(expected.createOrderStatus);
  const firstOrder = await readOrder(firstResponse);
  expect(firstOrder.orderNo).toBeTruthy();

  const duplicateResponse = await Actions.createOrder(request, token.access_token, orderRequest);
  expect(duplicateResponse.status()).toBe(expected.duplicateOrderStatus);
  const fault = await readFault(duplicateResponse);
  expect(fault.type).toContain('basket-not-found');
});

test('CUJ 1 — rejects an invalid shipping address with an actionable fault', async ({ request }) => {
  const token = await getGuestToken(request);
  const product = await findOrderableVariant(request, token.access_token);
  const checkout = createCheckoutInput(product);

  const createResponse = await Actions.createBasket(request, token.access_token);
  expect(createResponse.status()).toBe(expected.basketMutationStatus);
  const basketId = basketIdFrom((await createResponse.json()) as Basket);

  const itemResponse = await Actions.addProductToBasket(request, token.access_token, {
    basketId,
    body: checkout.productItems,
  });
  expect(itemResponse.status()).toBe(expected.basketMutationStatus);
  const basket = (await itemResponse.json()) as Basket;

  const addressResponse = await Actions.provideShippingAddress(request, token.access_token, {
    basketId,
    body: checkout.invalidAddress,
    shipmentId: defaultShipmentIdFrom(basket),
  });
  expect(addressResponse.status()).toBe(expected.invalidAddressStatus);
  const fault = await readFault(addressResponse);
  expect(fault.detail).toContain(expected.faultField);
});
