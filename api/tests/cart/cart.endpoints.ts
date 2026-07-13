import { shopperApiUrl } from '../../support/scapi';

export const baskets = (): string => shopperApiUrl('checkout/shopper-baskets/v1', 'baskets');

export const basket = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets/v1', `baskets/${encodeURIComponent(basketId)}`);

export const basketItems = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets/v1', `baskets/${encodeURIComponent(basketId)}/items`);

export const basketItem = (basketId: string, itemId: string): string =>
  shopperApiUrl(
    'checkout/shopper-baskets/v1',
    `baskets/${encodeURIComponent(basketId)}/items/${encodeURIComponent(itemId)}`,
  );
