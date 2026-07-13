import { shopperApiUrl } from '../../support/scapi';

export const category = (categoryId: string): string =>
  shopperApiUrl('product/shopper-products/v1', `categories/${encodeURIComponent(categoryId)}`);

// refine by category id to list that category's products
export const productSearch = (): string =>
  shopperApiUrl('search/shopper-search/v1', 'product-search');

// product ids can contain spaces (bundles), so encode them into the path
export const product = (productId: string): string =>
  shopperApiUrl('product/shopper-products/v1', `products/${encodeURIComponent(productId)}`);
