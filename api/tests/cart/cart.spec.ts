import { expect, test } from '@playwright/test';
import { required } from '../../support/scapi';
import type { Basket, Fault } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import * as Actions from './cart.actions';
import {
  cart,
  firstLineItem,
  lineItemByProductId,
  lineItems,
  lineItemsTotal,
  orderableVariantPair,
  subtotal,
  unavailableFaultType,
} from './cart.data';

// Add/update/remove cart; totals stick; over-stock fails.
test('reconcile a basket (update quantity, remove) with consistent, persisted totals', async ({
  request,
}) => {
  const { accessToken } = await getGuestToken(request);
  const [variantA, variantB] = await orderableVariantPair(request, accessToken);

  const createResponse = await Actions.createBasket(request, accessToken);
  expect(createResponse.status()).toBe(200);
  const created = (await createResponse.json()) as Basket;
  const basketId = required(created.basketId, 'basketId');

  const addResponse = await Actions.addItems(request, accessToken, basketId, [
    { productId: variantA.variantId, quantity: 1 },
    { productId: variantB.variantId, quantity: 1 },
  ]);
  expect(addResponse.status()).toBe(200);
  const afterAdd = (await addResponse.json()) as Basket;
  const added = lineItems(afterAdd);
  expect(added).toHaveLength(2);
  // Line prices sum to subtotal.
  expect(lineItemsTotal(added)).toBeCloseTo(subtotal(afterAdd), 2);

  const itemA = lineItemByProductId(afterAdd, variantA.variantId);
  const itemB = lineItemByProductId(afterAdd, variantB.variantId);
  const itemAId = required(itemA.itemId, 'itemId');
  const itemBId = required(itemB.itemId, 'itemId');

  // Change quantity.
  const updateResponse = await Actions.updateItemQuantity(
    request,
    accessToken,
    basketId,
    itemAId,
    cart.updatedQuantity,
  );
  expect(updateResponse.status()).toBe(200);
  const afterUpdate = (await updateResponse.json()) as Basket;
  const updatedItems = lineItems(afterUpdate);
  const updatedA = updatedItems.find((item) => item.itemId === itemAId);
  expect(updatedA?.quantity).toBe(cart.updatedQuantity);
  expect(lineItemsTotal(updatedItems)).toBeCloseTo(subtotal(afterUpdate), 2);

  // Remove the other item.
  const removeResponse = await Actions.removeItem(request, accessToken, basketId, itemBId);
  expect(removeResponse.status()).toBe(200);
  const afterRemove = (await removeResponse.json()) as Basket;
  const remaining = lineItems(afterRemove);
  expect(remaining).toHaveLength(1);
  expect(firstLineItem(afterRemove).productId).toBe(variantA.variantId);
  expect(lineItemsTotal(remaining)).toBeCloseTo(subtotal(afterRemove), 2);

  // Reload cart — changes should stick.
  const refetchResponse = await Actions.getBasket(request, accessToken, basketId);
  expect(refetchResponse.status()).toBe(200);
  const persisted = (await refetchResponse.json()) as Basket;
  const persistedItems = lineItems(persisted);
  expect(persistedItems).toHaveLength(1);
  const persistedA = firstLineItem(persisted);
  expect(persistedA.productId).toBe(variantA.variantId);
  expect(persistedA.quantity).toBe(cart.updatedQuantity);
  expect(lineItemsTotal(persistedItems)).toBeCloseTo(subtotal(persisted), 2);

  // Too many units → reject.
  const overResponse = await Actions.updateItemQuantity(
    request,
    accessToken,
    basketId,
    itemAId,
    cart.overQuantity,
  );
  expect(overResponse.status()).toBe(400);
  const fault = (await overResponse.json()) as Fault;
  expect(fault.type).toContain(unavailableFaultType);

  // Empty cart → no items, total 0.
  const emptyResponse = await Actions.removeItem(request, accessToken, basketId, itemAId);
  expect(emptyResponse.status()).toBe(200);
  const empty = (await emptyResponse.json()) as Basket;
  expect(lineItems(empty)).toHaveLength(0);
  expect(empty.productSubTotal).toBe(0);
});
