import { shopperApiUrl } from '../../support/scapi';

const CUSTOMERS = 'customer/shopper-customers/v1';
const BASKETS = 'checkout/shopper-baskets/v1';

export const customers = (): string => shopperApiUrl(CUSTOMERS, 'customers');

export const customer = (customerId: string): string =>
  shopperApiUrl(CUSTOMERS, `customers/${encodeURIComponent(customerId)}`);

export const customerBaskets = (customerId: string): string =>
  shopperApiUrl(CUSTOMERS, `customers/${encodeURIComponent(customerId)}/baskets`);

export const customerPassword = (customerId: string): string =>
  shopperApiUrl(CUSTOMERS, `customers/${encodeURIComponent(customerId)}/password`);

export const baskets = (): string => shopperApiUrl(BASKETS, 'baskets');

export const basketItems = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/items`);
