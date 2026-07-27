import { shopperApiUrl } from '../../support/scapi';

export const productSearch = (): string =>
  shopperApiUrl('search/shopper-search/v1', 'product-search');

// Encode product ids (may have spaces).
export const product = (productId: string): string =>
  shopperApiUrl('product/shopper-products/v1', `products/${encodeURIComponent(productId)}`);
