import { shopperApiUrl } from '../../support/scapi';

const BASKETS = 'checkout/shopper-baskets/v1';
const PRODUCTS = 'product/shopper-products/v1';

export const product = (productId: string): string =>
  shopperApiUrl(PRODUCTS, `products/${encodeURIComponent(productId)}`);

export const baskets = (): string => shopperApiUrl(BASKETS, 'baskets');

export const basket = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}`);

export const basketItems = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/items`);
