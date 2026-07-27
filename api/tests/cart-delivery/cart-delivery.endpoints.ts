import { shopperApiUrl } from '../../support/scapi';

// Encode product ids (may have spaces).
export const product = (productId: string): string =>
  shopperApiUrl('product/shopper-products/v1', `products/${encodeURIComponent(productId)}`);

export const baskets = (): string => shopperApiUrl('checkout/shopper-baskets/v1', 'baskets');

export const basket = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets/v1', `baskets/${encodeURIComponent(basketId)}`);

export const basketItems = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets/v1', `baskets/${encodeURIComponent(basketId)}/items`);
