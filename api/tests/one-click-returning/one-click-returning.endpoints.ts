import { shopperApiUrl, slasUrl } from '../../support/scapi';

export const customers = (): string => shopperApiUrl('customer/shopper-customers', 'customers');

export const baskets = (): string => shopperApiUrl('checkout/shopper-baskets', 'baskets');

export const basketItems = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets', `baskets/${encodeURIComponent(basketId)}/items`);

export const transferBasket = (): string =>
  shopperApiUrl('checkout/shopper-baskets', 'baskets/actions/transfer');

export const registeredLogin = (): string => slasUrl('oauth2/login');

export const token = (): string => slasUrl('oauth2/token');
