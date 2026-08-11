import type { APIResponse } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { findOrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type { Basket, Order, Product, ShippingMethodResult } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import { findPickupStore, findUnavailablePickupCombination } from '../../support/stores';
import * as Actions from './store-pickup.actions';
import * as Data from './store-pickup.data';

/**
 * OUT OF SCOPE: CUJ 6 Pain row 2 (inventory changes) and row 4
 * (pickup-shipment invalidation). Neither can be forced against live SCAPI without mocking it.
 */

const expectBasket = async (response: APIResponse): Promise<Basket> => {
  expect(response.status()).toBe(Data.expected.mutationStatus);
  return (await response.json()) as Basket;
};

const orderProduct = (order: Order, productId: string) =>
  required(
    order.productItems?.find((item) => item.productId === productId),
    `order product ${productId}`,
  );

const orderShipment = (order: Order, shipmentId: string) =>
  required(
    order.shipments?.find((shipment) => shipment.shipmentId === shipmentId),
    `order shipment ${shipmentId}`,
  );

test('CUJ 6 — places a confirmed pickup order for the selected store', async ({ request }) => {
  test.setTimeout(120_000);
  const token = await getGuestToken(request);
  const selectedStore = await findPickupStore(request, token.access_token);
  const preferredProduct = await findOrderableVariant(request, token.access_token);
  const product = await Actions.findStoreAvailableVariant(
    request,
    token.access_token,
    preferredProduct,
    selectedStore.inventoryListId,
  );
  const pickupAddress = Data.pickupAddressFor(selectedStore.store);
  let basketId = '';
  let shipmentId = '';
  let basket: Basket = {};
  let order: Order = {};

  await test.step('Find/select store', () => {
    expect(selectedStore.store.id).toBeTruthy();
    expect(selectedStore.inventoryListId).toBe(selectedStore.store.inventoryId);
  });

  await test.step('Find store-available product', () => {
    expect(product.availableToSell).toBeGreaterThan(0);
    expect(product.variantId).toBeTruthy();
  });

  await test.step('Add as Pickup in Store', async () => {
    const createResponse = await Actions.createBasket(request, token.access_token);
    basket = await expectBasket(createResponse);
    basketId = Data.basketIdFrom(basket);
    shipmentId = Data.defaultShipmentIdFrom(basket);

    const itemResponse = await Actions.addPickupItem(request, token.access_token, {
      basketId,
      body: Data.pickupItemRequest(product, selectedStore.inventoryListId, shipmentId),
    });
    basket = await expectBasket(itemResponse);
    expect(basket.productItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          inventoryId: selectedStore.inventoryListId,
          productId: product.variantId,
          shipmentId,
        }),
      ]),
    );
  });

  await test.step('Preserve pickup shipment through checkout', async () => {
    await expectBasket(
      await Actions.provideContact(request, token.access_token, {
        basketId,
        body: Data.customerRequest(),
      }),
    );
    await expectBasket(
      await Actions.providePickupAddress(request, token.access_token, {
        basketId,
        body: pickupAddress,
        shipmentId,
      }),
    );
    await expectBasket(
      await Actions.provideBillingAddress(request, token.access_token, {
        basketId,
        body: Data.billingAddressRequest(),
      }),
    );

    const methodsResponse = await Actions.getShippingMethods(request, token.access_token, {
      basketId,
      shipmentId,
    });
    expect(methodsResponse.status()).toBe(Data.expected.mutationStatus);
    const pickupMethodId = Data.pickupMethodIdFrom(
      (await methodsResponse.json()) as ShippingMethodResult,
    );
    basket = await expectBasket(
      await Actions.selectShippingMethod(request, token.access_token, {
        basketId,
        body: Data.shippingMethodRequestFor(pickupMethodId),
        shipmentId,
      }),
    );
    expect(basket.shipments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          shipmentId,
          shippingAddress: expect.objectContaining({
            address1: pickupAddress.address1,
            postalCode: pickupAddress.postalCode,
          }),
          shippingMethod: expect.objectContaining({ name: Data.expected.pickupMethodName }),
        }),
      ]),
    );
  });

  await test.step('Pay/place order', async () => {
    basket = await expectBasket(
      await Actions.providePayment(request, token.access_token, {
        basketId,
        body: Data.paymentInstrumentFor(basket),
      }),
    );
    const orderResponse = await Actions.createOrder(
      request,
      token.access_token,
      Data.orderRequestFor(basketId),
    );
    expect(orderResponse.status()).toBe(Data.expected.mutationStatus);
    order = (await orderResponse.json()) as Order;
    expect(order.status).toBe(Data.expected.orderStatus);
  });

  await test.step('Receive pickup confirmation', () => {
    const confirmedItem = orderProduct(order, product.variantId);
    const confirmedShipment = orderShipment(order, shipmentId);
    expect(order.orderNo).toMatch(Data.expected.orderNumberPattern);
    expect(confirmedItem.inventoryId).toBe(selectedStore.inventoryListId);
    expect(confirmedItem.shipmentId).toBe(shipmentId);
    expect(confirmedShipment.shippingMethod?.name).toBe(Data.expected.pickupMethodName);
    expect(confirmedShipment.shippingAddress).toEqual(
      expect.objectContaining({
        address1: pickupAddress.address1,
        city: pickupAddress.city,
        countryCode: pickupAddress.countryCode,
        postalCode: pickupAddress.postalCode,
        stateCode: pickupAddress.stateCode,
      }),
    );
    test.info().annotations.push({ type: 'orderNo', description: String(order.orderNo) });
  });
});

test('CUJ 6 — reports no pickup availability for a store without the required inventory', async ({
  request,
}) => {
  const token = await getGuestToken(request);
  const combination = await findUnavailablePickupCombination(request, token.access_token);

  switch (combination.kind) {
    case 'none-found':
      test.skip(true, combination.reason);
      return;
    case 'found': {
      const response = await Actions.getProductAtStore(
        request,
        token.access_token,
        combination.productId,
        combination.store.inventoryListId,
      );
      expect(response.status()).toBe(Data.expected.mutationStatus);
      const product = (await response.json()) as Product;
      const inventory = required(product.inventories?.[0], 'product.inventories[0]');
      expect(inventory.orderable === false || inventory.ats === 0).toBe(true);
      expect(combination.store.store.id).toBeTruthy();
    }
  }
});
