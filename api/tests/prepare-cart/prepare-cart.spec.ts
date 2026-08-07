import { expect, test } from '@playwright/test';
import { required } from '../../support/scapi';
import type { Basket } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import * as Actions from './prepare-cart.actions';
import {
  checkoutEmail,
  collectionStoreId,
  deliveryShipmentId,
  itemCount,
  lineFor,
  lineItems,
  lineItemsTotal,
  linesFor,
  linesOnShipment,
  orderableVariants,
  shipmentById,
  shipmentsOf,
  subtotal,
  unmatchedCouponCode,
} from './prepare-cart.data';

// The API counterpart of the prepare-cart browser journey, step for step.
//
// A basket is only ready for checkout once every line is priced, the amounts are
// fixed, what the shopper does not want is dropped, and the handover is intact.
//
// Three of the browser journey's assertions have no API counterpart and are
// substituted, each noted where it stands: the promo-code box becomes a coupon
// submission, the pickup option being closed off becomes the shipment carrying no
// store, and arriving at /checkout becomes checkout's own first write landing.
test('review a two item basket, fix it up, and take it to checkout', async ({ request }) => {
  test.setTimeout(150000);

  const { accessToken } = await getGuestToken(request);
  const [kept, removed] = await orderableVariants(request);

  const createResponse = await Actions.createBasket(request, accessToken);
  expect(createResponse.status()).toBe(200);
  const basketId = required(((await createResponse.json()) as Basket).basketId, 'basketId');

  expect((await Actions.addProductToCart(request, accessToken, basketId, kept)).status()).toBe(200);
  expect((await Actions.addProductToCart(request, accessToken, basketId, removed)).status()).toBe(
    200,
  );

  const cartResponse = await Actions.openCart(request, accessToken, basketId);
  expect(cartResponse.status()).toBe(200);
  const cart = (await cartResponse.json()) as Basket;
  expect(cart.basketId).toBe(basketId);
  expect(itemCount(cart)).toBe(2);

  // Both lines come back filled in from the product catalog.
  const keptLine = lineFor(cart, kept.variantId);
  expect(keptLine.productName).toBe(kept.productName);
  expect(typeof keptLine.price).toBe('number');
  const removedLine = lineFor(cart, removed.variantId);
  expect(removedLine.productName).toBe(removed.productName);
  expect(typeof removedLine.price).toBe('number');

  // The basket totals its own lines, which is what the order summary renders.
  expect(typeof cart.productSubTotal).toBe('number');
  expect(lineItemsTotal(cart)).toBeCloseTo(subtotal(cart), 2);

  // Promotions are reviewed from the cart: the coupon resource takes a code and
  // answers for it. Substitutes the browser journey opening the promo accordion
  // and finding the code box.
  const coupon = await Actions.openPromoCode(request, accessToken, basketId, unmatchedCouponCode);
  expect(coupon.status).not.toBe(404);
  expect(coupon.faultType).toBeTruthy();

  // Handover stays as delivery. Collecting in store needs a store first, so the
  // shipment carrying none is what keeps pickup closed off — the API counterpart
  // of the cart's pickup choice being disabled.
  expect(keptLine.shipmentId).toBe(deliveryShipmentId);
  expect(collectionStoreId(shipmentById(cart, deliveryShipmentId))).toBeUndefined();

  const increased = await Actions.increaseQuantity(
    request,
    accessToken,
    basketId,
    required(keptLine.itemId, 'itemId'),
    2,
  );
  expect(increased.status()).toBe(200);
  const afterIncrease = (await increased.json()) as Basket;
  expect(itemCount(afterIncrease)).toBe(3);
  expect(lineFor(afterIncrease, kept.variantId).quantity).toBe(2);

  const removeResponse = await Actions.removeItem(
    request,
    accessToken,
    basketId,
    required(lineFor(afterIncrease, removed.variantId).itemId, 'itemId'),
  );
  expect(removeResponse.status()).toBe(200);
  const afterRemove = (await removeResponse.json()) as Basket;

  expect(linesFor(afterRemove, removed.variantId)).toHaveLength(0);
  expect(itemCount(afterRemove)).toBe(2);
  expect(lineItems(afterRemove)).toHaveLength(1);
  expect(lineFor(afterRemove, kept.variantId).quantity).toBe(2);
  expect(shipmentsOf(afterRemove)).toHaveLength(1);
  expect(linesOnShipment(afterRemove, deliveryShipmentId)).toHaveLength(1);
  expect(lineFor(afterRemove, kept.variantId).shipmentId).toBe(deliveryShipmentId);
  expect(collectionStoreId(shipmentById(afterRemove, deliveryShipmentId))).toBeUndefined();

  // Checkout accepts the basket: its first write lands, and the basket comes back
  // carrying the shopper it will be ordered for. Substitutes arriving at
  // /checkout and the checkout page rendering.
  const checkoutResponse = await Actions.proceedToCheckout(
    request,
    accessToken,
    basketId,
    checkoutEmail,
  );
  expect(checkoutResponse.status()).toBe(200);
  const atCheckout = (await checkoutResponse.json()) as Basket;
  expect(atCheckout.customerInfo?.email).toBe(checkoutEmail);
  expect(itemCount(atCheckout)).toBe(2);
});
