import { expect, test } from '@playwright/test';
import { getGuestToken } from '../../support/slas';
import * as Actions from './cart-delivery.actions';
import type { Basket, Fault, Product } from './cart-delivery.data';
import {
  deliveryProduct,
  firstLineItem,
  lineItems,
  variantsOf,
  variationCount,
} from './cart-delivery.data';

// Add in-stock size to cart; reject over-stock.
test('configure a variant and add it to the basket for delivery', async ({ request }) => {
  const { accessToken } = await getGuestToken(request);

  // Pick an in-stock size.
  const productResponse = await Actions.getProduct(request, accessToken, deliveryProduct.masterId);
  expect(productResponse.status()).toBe(200);
  const product = (await productResponse.json()) as Product;
  const variant = variantsOf(product).find((candidate) => candidate.orderable);
  if (!variant) throw new Error('expected an orderable variant');
  expect(variationCount(variant)).toBeGreaterThan(0);
  expect(typeof variant.price).toBe('number');

  // New cart ships by default.
  const createResponse = await Actions.createBasket(request, accessToken);
  expect(createResponse.status()).toBe(200);
  const basket = (await createResponse.json()) as Basket;
  expect(basket.basketId).toBeTruthy();

  const addResponse = await Actions.addItem(
    request,
    accessToken,
    basket.basketId,
    variant.productId,
    deliveryProduct.quantity,
  );
  expect(addResponse.status()).toBe(200);
  const afterAdd = (await addResponse.json()) as Basket;
  const item = firstLineItem(afterAdd);
  expect(item.productId).toBe(variant.productId);
  expect(item.quantity).toBe(deliveryProduct.quantity);
  expect(typeof item.price).toBe('number');
  expect(item.shipmentId).toBe('me'); // "me" is the default delivery shipment

  // Reload cart — item should stick.
  const refetchResponse = await Actions.getBasket(request, accessToken, basket.basketId);
  expect(refetchResponse.status()).toBe(200);
  const persisted = (await refetchResponse.json()) as Basket;
  const persistedItem = lineItems(persisted).find(
    (candidate) => candidate.productId === variant.productId,
  );
  expect(persistedItem?.quantity).toBe(deliveryProduct.quantity);

  // Too many units → reject.
  const overResponse = await Actions.addItem(
    request,
    accessToken,
    basket.basketId,
    variant.productId,
    deliveryProduct.overQuantity,
  );
  expect(overResponse.status()).toBe(400);
  const fault = (await overResponse.json()) as Fault;
  expect(fault.type).toContain('product-item-not-available');
});
