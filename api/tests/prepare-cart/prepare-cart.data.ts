import type { APIRequestContext } from '@playwright/test';
import type { UiOrderableVariant } from '../../support/products';
import { findUiOrderableVariant } from '../../support/products';
import { customString } from '../../support/scapi';
import type { Basket, BasketProductItem, BasketShipment } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';

export interface CartFixture {
  keptMasterId: string;
  removedMasterId: string;
}

// Two different products, so one line can go and another can stay. Same pair the
// browser journey uses, so both layers reconcile the same basket.
export const cartProducts: CartFixture = {
  keptMasterId: '25591139M',
  removedMasterId: '25518484M',
};

// Both sizes are resolved at run time. The demo store's stock keeps moving.
export const orderableVariants = async (
  request: APIRequestContext,
): Promise<[UiOrderableVariant, UiOrderableVariant]> => {
  const { accessToken } = await getGuestToken(request);
  const kept = await findUiOrderableVariant(request, accessToken, cartProducts.keptMasterId);
  const removed = await findUiOrderableVariant(request, accessToken, cartProducts.removedMasterId);

  // Same size twice would merge into one cart line and there would be nothing to remove.
  if (kept.variantId === removed.variantId) {
    throw new Error(
      `products ${cartProducts.keptMasterId} and ${cartProducts.removedMasterId} both resolved to ` +
        `variant ${kept.variantId}; the demo store's stock has likely changed`,
    );
  }
  return [kept, removed];
};

export const lineItems = (basket: Basket): BasketProductItem[] => basket.productItems ?? [];

export const shipmentsOf = (basket: Basket): BasketShipment[] => basket.shipments ?? [];

// The line holding one product, or fail clear.
export const lineFor = (basket: Basket, productId: string): BasketProductItem => {
  const item = lineItems(basket).find((candidate) => candidate.productId === productId);
  if (item === undefined) throw new Error(`the basket holds no line for product ${productId}`);
  return item;
};

export const linesFor = (basket: Basket, productId: string): BasketProductItem[] =>
  lineItems(basket).filter((candidate) => candidate.productId === productId);

// What the cart heading counts: every unit across every line.
export const itemCount = (basket: Basket): number =>
  lineItems(basket).reduce((sum, item) => sum + (item.quantity ?? 0), 0);

// What the order summary adds up. Only the subtotal is available at the cart
// stage: a basket carries no orderTotal until it has a shipping method, so the
// summary shows shipping and tax as pending rather than as amounts.
export const lineItemsTotal = (basket: Basket): number =>
  lineItems(basket).reduce(
    (sum, item) => sum + (item.priceAfterItemDiscount ?? item.price ?? 0),
    0,
  );

export const subtotal = (basket: Basket): number => basket.productSubTotal ?? -1;

// A shipment groups the lines assigned to it, which is what the cart's
// "Delivery - N out of N items" label counts.
export const linesOnShipment = (basket: Basket, shipmentId: string): BasketProductItem[] =>
  lineItems(basket).filter((item) => item.shipmentId === shipmentId);

// The shipment a basket ships from by default.
export const deliveryShipmentId = 'me';

export const shipmentById = (basket: Basket, shipmentId: string): BasketShipment => {
  const shipment = shipmentsOf(basket).find((entry) => entry.shipmentId === shipmentId);
  if (shipment === undefined) throw new Error(`the basket has no shipment ${shipmentId}`);
  return shipment;
};

// A shipment collects in store only once a store is attached to it, which is the
// same condition that lets the cart offer pickup on a line.
export const collectionStoreId = (shipment: BasketShipment): string | undefined =>
  customString(shipment.c_fromStoreId);

export interface CouponAttempt {
  status: number;
  faultType: string | undefined;
}

// A code no promotion can match, so the answer is the basket's own coupon
// handling rather than a discount.
export const unmatchedCouponCode = 'PREPARE-CART-NO-SUCH-CODE';

export const checkoutEmail = 'test.shopper@gmail.com';
