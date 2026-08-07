import { shopperApiUrl } from '../../support/scapi';

const PRODUCTS = 'product/shopper-products/v1';
const SEARCH = 'search/shopper-search/v1';

export const productSearch = (): string => shopperApiUrl(SEARCH, 'product-search');

export const product = (productId: string): string =>
  shopperApiUrl(PRODUCTS, `products/${encodeURIComponent(productId)}`);
