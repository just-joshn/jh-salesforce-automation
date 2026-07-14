import { expect, test } from '@playwright/test';
import { findOrderableVariants } from '../../support/products';
import { getGuestToken } from '../../support/slas';
import * as Actions from './cart.actions';
import type { Basket, Fault } from './cart.data';
import { cart, firstLineItem, lineItems, lineItemsTotal, subtotal } from './cart.data';

// Add, update, and remove basket items; totals stay consistent and persist, and over-stock is rejected.
test('reconcile a basket (update quantity, remove) with consistent, persisted totals', async ({
  request,
}) => {
  const { accessToken } = await getGuestToken(request);

  // Resolve two variants that are in stock right now instead of trusting a hardcoded pair.
  const [variantA, variantB] = await findOrderableVariants(request, accessToken, {
    masterId: cart.masterId,
    minCount: 2,
  });
  if (!variantA || !variantB) throw new Error('expected two orderable variants');

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
  // line items should sum to the subtotal
  expect(lineItemsTotal(added)).toBeCloseTo(subtotal(afterAdd), 2);

  const itemA = added.find((item) => item.productId === variantA.variantId);
  const itemB = added.find((item) => item.productId === variantB.variantId);
  if (!itemA || !itemB) throw new Error('expected both items in the basket');

  // update a line's quantity
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

  // remove the other line
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

  // re-fetch to confirm the changes persisted
  const refetchResponse = await Actions.getBasket(request, accessToken, created.basketId);
  expect(refetchResponse.status()).toBe(200);
  const persisted = (await refetchResponse.json()) as Basket;
  const persistedItems = lineItems(persisted);
  expect(persistedItems).toHaveLength(1);
  const persistedA = firstLineItem(persisted);
  expect(persistedA.productId).toBe(variantA.variantId);
  expect(persistedA.quantity).toBe(cart.updatedQuantity);
  expect(lineItemsTotal(persistedItems)).toBeCloseTo(subtotal(persisted), 2);

  // an over-stock quantity must be rejected
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

  // emptying the cart leaves no items and a zero total
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
