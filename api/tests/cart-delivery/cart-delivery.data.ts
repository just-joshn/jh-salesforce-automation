import type { Basket, BasketProductItem, Product, ProductVariant } from '../../support/scapi-types';

// Color/size list; missing if none.
export const variantsOf = (product: Product): ProductVariant[] => product.variants ?? [];

// First size that can be bought, or fail clear.
export const firstOrderableVariant = (product: Product): ProductVariant => {
  const variant = variantsOf(product).find((candidate) => candidate.orderable);
  if (!variant) throw new Error('expected an orderable variant');
  return variant;
};

// How many options (color, size, …) are set.
export const variationCount = (variant: ProductVariant): number =>
  Object.keys(variant.variationValues ?? {}).length;

export const lineItems = (basket: Basket): BasketProductItem[] => basket.productItems ?? [];

// First cart line, or fail clear.
export const firstLineItem = (basket: Basket): BasketProductItem => {
  const [item] = lineItems(basket);
  if (!item) throw new Error('expected the added product item');
  return item;
};

export interface DeliveryFixture {
  masterId: string;
  quantity: number;
  overQuantity: number;
  defaultShipmentId: string;
}

// Product that can ship. "me" is the shipment a new basket ships from by default.
export const deliveryProduct: DeliveryFixture = {
  masterId: '25591139M',
  quantity: 2,
  overQuantity: 999999,
  defaultShipmentId: 'me',
};

// Ordering more units than exist fails with this fault.
export const unavailableFaultType = 'product-item-not-available';
