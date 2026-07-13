import { shopperApiUrl } from '../../support/scapi';

export const productSearch = (): string =>
  shopperApiUrl('search/shopper-search/v1', 'product-search');

// ids can contain spaces (bundles), so they're URL-encoded into the path
export const product = (productId: string): string =>
  shopperApiUrl('product/shopper-products/v1', `products/${encodeURIComponent(productId)}`);
