import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { findOrderableVariant, type OrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type { Basket, Order, ShippingMethodResult } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import * as Actions from './multi-shipment.actions';
import * as Data from './multi-shipment.data';

/**
 * OUT OF SCOPE: CUJ 7 Pain row 2 (assignment comprehension). This UX-research claim is not a
 * functional observable, and forcing a contrary SCAPI state would require banned service mocking.
 */

interface PreparedShipments {
  readonly basket: Basket;
  readonly basketId: string;
  readonly products: readonly [OrderableVariant, OrderableVariant];
  readonly shipmentIds: readonly [string, string];
}

const expectBasket = async (response: APIResponse): Promise<Basket> => {
  expect(response.status()).toBe(Data.expected.mutationStatus);
  return (await response.json()) as Basket;
};

const prepareTwoShipments = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<PreparedShipments> => {
  const firstProduct = await findOrderableVariant(request, accessToken);
  const secondProduct = await Actions.findDistinctOrderableVariant(
    request,
    accessToken,
    firstProduct.productId,
  );
  const createdBasket = await expectBasket(await Actions.createBasket(request, accessToken));
  const basketId = Data.basketIdFrom(createdBasket);
  const firstShipmentId = Data.defaultShipmentIdFrom(createdBasket);
  const secondShipment = Data.secondShipmentRequest();
  await expectBasket(
    await Actions.createShipment(request, accessToken, { basketId, body: secondShipment }),
  );
  await expectBasket(
    await Actions.addProductToShipment(request, accessToken, {
      basketId,
      body: Data.productItemRequest(firstProduct, firstShipmentId),
    }),
  );
  const basket = await expectBasket(
    await Actions.addProductToShipment(request, accessToken, {
      basketId,
      body: Data.productItemRequest(secondProduct, secondShipment.shipmentId),
    }),
  );
  return {
    basket,
    basketId,
    products: [firstProduct, secondProduct],
    shipmentIds: [firstShipmentId, secondShipment.shipmentId],
  };
};

const shippingMethods = async (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  shipmentId: string,
): Promise<ShippingMethodResult> => {
  const response = await Actions.getShippingMethods(request, accessToken, { basketId, shipmentId });
  expect(response.status()).toBe(Data.expected.mutationStatus);
  return (await response.json()) as ShippingMethodResult;
};

const selectDefaultShippingMethod = async (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  shipmentId: string,
): Promise<Basket> => {
  const methods = await shippingMethods(request, accessToken, basketId, shipmentId);
  const methodId = Data.defaultShippingMethodIdFrom(methods);
  return expectBasket(
    await Actions.selectShippingMethod(request, accessToken, {
      basketId,
      body: Data.shippingMethodRequestFor(methodId),
      shipmentId,
    }),
  );
};

test('CUJ 7 — creates one order with items assigned to two shipments', async ({ request }) => {
  test.setTimeout(120_000);
  const token = await getGuestToken(request);
  let prepared: PreparedShipments | undefined;
  let basket: Basket = {};
  let order: Order = {};

  await test.step('Start multi-shipment checkout', async () => {
    prepared = await prepareTwoShipments(request, token.access_token);
    basket = prepared.basket;
    expect(prepared.shipmentIds[0]).not.toBe(prepared.shipmentIds[1]);
    expect(basket.shipments).toHaveLength(Data.expected.shipmentCount);
  });

  await test.step('Assign products/quantities', () => {
    const state = required(prepared, 'prepared shipments');
    expect(state.products[0].productId).not.toBe(state.products[1].productId);
    expect(basket.productItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: state.products[0].variantId,
          quantity: 1,
          shipmentId: state.shipmentIds[0],
        }),
        expect.objectContaining({
          productId: state.products[1].variantId,
          quantity: 1,
          shipmentId: state.shipmentIds[1],
        }),
      ]),
    );
  });

  await test.step('Supply/select addresses or pickup locations', async () => {
    const state = required(prepared, 'prepared shipments');
    await expectBasket(
      await Actions.provideContact(request, token.access_token, {
        basketId: state.basketId,
        body: Data.customerRequest(),
      }),
    );
    await expectBasket(
      await Actions.provideShippingAddress(request, token.access_token, {
        basketId: state.basketId,
        body: Data.destinationAddresses[0],
        shipmentId: state.shipmentIds[0],
      }),
    );
    basket = await expectBasket(
      await Actions.provideShippingAddress(request, token.access_token, {
        basketId: state.basketId,
        body: Data.destinationAddresses[1],
        shipmentId: state.shipmentIds[1],
      }),
    );
    expect(basket.shipments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          shipmentId: state.shipmentIds[0],
          shippingAddress: expect.objectContaining({
            postalCode: Data.destinationAddresses[0].postalCode,
          }),
        }),
        expect.objectContaining({
          shipmentId: state.shipmentIds[1],
          shippingAddress: expect.objectContaining({
            postalCode: Data.destinationAddresses[1].postalCode,
          }),
        }),
      ]),
    );
  });

  await test.step('Select valid shipping methods', async () => {
    const state = required(prepared, 'prepared shipments');
    await selectDefaultShippingMethod(
      request,
      token.access_token,
      state.basketId,
      state.shipmentIds[0],
    );
    basket = await selectDefaultShippingMethod(
      request,
      token.access_token,
      state.basketId,
      state.shipmentIds[1],
    );
    expect(basket.shipments?.every((shipment) => shipment.shippingMethod?.id)).toBe(true);
  });

  await test.step('Pay/place order', async () => {
    const state = required(prepared, 'prepared shipments');
    basket = await expectBasket(
      await Actions.providePayment(request, token.access_token, {
        basketId: state.basketId,
        body: Data.paymentInstrumentFor(basket),
      }),
    );
    const response = await Actions.createOrder(
      request,
      token.access_token,
      Data.orderRequestFor(state.basketId),
    );
    expect(response.status()).toBe(Data.expected.mutationStatus);
    order = (await response.json()) as Order;
    expect(order.status).toBe(Data.expected.orderStatus);
  });

  await test.step('Verify fulfillment in confirmation', () => {
    const state = required(prepared, 'prepared shipments');
    expect(order.orderNo).toMatch(Data.expected.orderNumberPattern);
    expect(order.shipments).toHaveLength(Data.expected.shipmentCount);
    expect(order.productItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: state.products[0].variantId,
          shipmentId: state.shipmentIds[0],
        }),
        expect.objectContaining({
          productId: state.products[1].variantId,
          shipmentId: state.shipmentIds[1],
        }),
      ]),
    );
    console.log(
      `REAL MULTI-SHIPMENT ORDER NUMBER: ${order.orderNo}; ${state.products[0].variantId}->${state.shipmentIds[0]}, ${state.products[1].variantId}->${state.shipmentIds[1]}`,
    );
  });
});

test('CUJ 7 — refetches shipping methods when a shipment destination changes', async ({
  request,
}) => {
  test.setTimeout(120_000);
  const token = await getGuestToken(request);
  const prepared = await prepareTwoShipments(request, token.access_token);
  const changedShipmentId = prepared.shipmentIds[0];

  await expectBasket(
    await Actions.provideShippingAddress(request, token.access_token, {
      basketId: prepared.basketId,
      body: Data.destinationAddresses[0],
      shipmentId: changedShipmentId,
    }),
  );
  const before = await shippingMethods(
    request,
    token.access_token,
    prepared.basketId,
    changedShipmentId,
  );
  await selectDefaultShippingMethod(
    request,
    token.access_token,
    prepared.basketId,
    changedShipmentId,
  );

  const changedBasket = await expectBasket(
    await Actions.provideShippingAddress(request, token.access_token, {
      basketId: prepared.basketId,
      body: Data.destinationAddresses[1],
      shipmentId: changedShipmentId,
    }),
  );
  const after = await shippingMethods(
    request,
    token.access_token,
    prepared.basketId,
    changedShipmentId,
  );
  const changedShipment = Data.shipmentFrom(changedBasket, changedShipmentId);
  const afterIds = (after.applicableShippingMethods ?? []).map((method) => method.id);

  expect(changedShipment.shippingAddress).toEqual(
    expect.objectContaining({
      address1: Data.destinationAddresses[1].address1,
      postalCode: Data.destinationAddresses[1].postalCode,
      stateCode: Data.destinationAddresses[1].stateCode,
    }),
  );
  expect(before.applicableShippingMethods?.length).toBeGreaterThan(0);
  expect(afterIds.length).toBeGreaterThan(0);
  expect(Data.shippingMethodIsApplicable(changedShipment, after)).toBe(true);
});
