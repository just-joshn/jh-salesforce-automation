import { shopperApiUrl, slasUrl } from '../../support/scapi';

export const basket = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets', `baskets/${encodeURIComponent(basketId)}`);

export const basketItems = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets', `baskets/${encodeURIComponent(basketId)}/items`);

export const baskets = (): string => shopperApiUrl('checkout/shopper-baskets', 'baskets');

export const customers = (): string => shopperApiUrl('customer/shopper-customers', 'customers');

export const passwordlessLogin = (): string => slasUrl('oauth2/passwordless/login');
