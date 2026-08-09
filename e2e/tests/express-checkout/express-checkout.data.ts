import type { OrderableVariant } from '../../../api/support/products';

export interface ProductSelection {
  readonly productId: string;
  readonly productName: string;
  readonly variantId: string;
}

export const selectProduct = (product: OrderableVariant): ProductSelection =>
  Object.freeze({
    productId: product.productId,
    productName: product.productName,
    variantId: product.variantId,
  });

export const isBundleOrSet = (productName: string): boolean =>
  /\b(bundle|set)\b/i.test(productName);
