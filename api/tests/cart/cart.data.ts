import type { APIRequestContext } from '@playwright/test';
import type { OrderableVariant } from '../../support/products';
import { findOrderableVariants } from '../../support/products';
import type { Basket, BasketProductItem } from '../../support/scapi-types';

export interface AddItem {
  productId: string;
  quantity: number;
}

export interface CartFixture {
  masterId: string;
  updatedQuantity: number;
  overQuantity: number;
}

// Main product id. Two in-stock sizes are resolved at run time. overQuantity is impossibly large.
export const cart: CartFixture = {
  masterId: '25591139M',
  updatedQuantity: 3,
  overQuantity: 999999,
};

// Ordering more units than exist fails with this fault.
export const unavailableFaultType = 'product-item-not-available';

// Two sizes that are in stock right now; the demo store's stock keeps moving.
export const orderableVariantPair = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<[OrderableVariant, OrderableVariant]> => {
  const found = await findOrderableVariants(request, accessToken, {
    masterId: cart.masterId,
    minCount: 2,
  });
  const [first, second] = found;
  if (!first || !second) throw new Error('expected two orderable variants');
  return [first, second];
};

// Cart lines; empty cart → [].
export const lineItems = (basket: Basket): BasketProductItem[] => basket.productItems ?? [];

// First cart line, or fail clear.
export const firstLineItem = (basket: Basket): BasketProductItem => {
  const [item] = lineItems(basket);
  if (!item) throw new Error('expected at least one product item in the basket');
  return item;
};

// The line holding one product, or fail clear.
export const lineItemByProductId = (basket: Basket, productId: string): BasketProductItem => {
  const item = lineItems(basket).find((candidate) => candidate.productId === productId);
  if (!item) throw new Error(`expected the basket to hold product ${productId}`);
  return item;
};

// Cart subtotal (-1 if missing so tests fail).
export const subtotal = (basket: Basket): number => basket.productSubTotal ?? -1;

// Sum after discounts (matches basket subtotal on sale items).
export const lineItemsTotal = (items: BasketProductItem[]): number =>
  items.reduce((sum, item) => sum + (item.priceAfterItemDiscount ?? item.price ?? 0), 0);
