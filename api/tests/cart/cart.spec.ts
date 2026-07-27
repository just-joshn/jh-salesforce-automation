import { expect, test } from '@playwright/test';
import { findOrderableVariants } from '../../support/products';
import { getGuestToken } from '../../support/slas';
import * as Actions from './cart.actions';
import type { Basket, Fault } from './cart.data';
import { cart, firstLineItem, lineItems, lineItemsTotal, subtotal } from './cart.data';

const requireDefined = <T>(value: T | undefined, message: string): T => {
  if (value === undefined) throw new Error(message);
  return value;
};

// Add/update/remove cart; totals stick; over-stock fails.
test('reconcile a basket (update quantity, remove) with consistent, persisted totals', async ({
  request,
}) => {
  const { accessToken } = await getGuestToken(request);

  // Pick two sizes that are in stock right now.
  const found = await findOrderableVariants(request, accessToken, {
    masterId: cart.masterId,
    minCount: 2,
  });
  const variantA = requireDefined(found[0], 'expected two orderable variants');
  const variantB = requireDefined(found[1], 'expected two orderable variants');

  const createResponse = await Actions.createBasket(request, accessToken);
  expect(createResponse.status()).toBe(200);
  const created = (await createResponse.json()) as Basket;

  const addResponse = await Actions.addItems(request, accessToken, created.basketId, [
    { productId: variantA.variantId, quantity: 1 },
    { productId: variantB.variantId, quantity: 1 },
  ]);
  expect(addResponse.status()).toBe(200);
  const afterAdd = (await addResponse.json()) as Basket;
  const added = lineItems(afterAdd);
  expect(added).toHaveLength(2);
  // Line prices sum to subtotal.
  expect(lineItemsTotal(added)).toBeCloseTo(subtotal(afterAdd), 2);

  const itemA = requireDefined(
    added.find((item) => item.productId === variantA.variantId),
    'expected both items in the basket',
  );
  const itemB = requireDefined(
    added.find((item) => item.productId === variantB.variantId),
    'expected both items in the basket',
  );

  // Change quantity.
  const updateResponse = await Actions.updateItemQuantity(
    request,
    accessToken,
    created.basketId,
    itemA.itemId,
    cart.updatedQuantity,
  );
  expect(updateResponse.status()).toBe(200);
  const afterUpdate = (await updateResponse.json()) as Basket;
  const updatedItems = lineItems(afterUpdate);
  const updatedA = updatedItems.find((item) => item.itemId === itemA.itemId);
  expect(updatedA?.quantity).toBe(cart.updatedQuantity);
  expect(lineItemsTotal(updatedItems)).toBeCloseTo(subtotal(afterUpdate), 2);

  // Remove the other item.
  const removeResponse = await Actions.removeItem(
    request,
    accessToken,
    created.basketId,
    itemB.itemId,
  );
  expect(removeResponse.status()).toBe(200);
  const afterRemove = (await removeResponse.json()) as Basket;
  const remaining = lineItems(afterRemove);
  expect(remaining).toHaveLength(1);
  expect(firstLineItem(afterRemove).productId).toBe(variantA.variantId);
  expect(lineItemsTotal(remaining)).toBeCloseTo(subtotal(afterRemove), 2);

  // Reload cart — changes should stick.
  const refetchResponse = await Actions.getBasket(request, accessToken, created.basketId);
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
    created.basketId,
    itemA.itemId,
    cart.overQuantity,
  );
  expect(overResponse.status()).toBe(400);
  const fault = (await overResponse.json()) as Fault;
  expect(fault.type).toContain('product-item-not-available');

  // Empty cart → no items, total 0.
  const emptyResponse = await Actions.removeItem(
    request,
    accessToken,
    created.basketId,
    itemA.itemId,
  );
  expect(emptyResponse.status()).toBe(200);
  const empty = (await emptyResponse.json()) as Basket;
  expect(lineItems(empty)).toHaveLength(0);
  expect(empty.productSubTotal).toBe(0);
});
