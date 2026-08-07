import { shopperApiUrl } from '../../support/scapi';

const CUSTOMERS = 'customer/shopper-customers/v1';
const PRODUCTS = 'product/shopper-products/v1';
const BASKETS = 'checkout/shopper-baskets/v1';

export const customers = (): string => shopperApiUrl(CUSTOMERS, 'customers');

export const customer = (customerId: string): string =>
  shopperApiUrl(CUSTOMERS, `customers/${encodeURIComponent(customerId)}`);

export const customerProductLists = (customerId: string): string =>
  shopperApiUrl(CUSTOMERS, `customers/${encodeURIComponent(customerId)}/product-lists`);

export const customerProductList = (customerId: string, listId: string): string =>
  shopperApiUrl(
    CUSTOMERS,
    `customers/${encodeURIComponent(customerId)}/product-lists/${encodeURIComponent(listId)}`,
  );

export const customerProductListItems = (customerId: string, listId: string): string =>
  shopperApiUrl(
    CUSTOMERS,
    `customers/${encodeURIComponent(customerId)}/product-lists/${encodeURIComponent(listId)}/items`,
  );

export const product = (productId: string): string =>
  shopperApiUrl(PRODUCTS, `products/${encodeURIComponent(productId)}`);

export const baskets = (): string => shopperApiUrl(BASKETS, 'baskets');

export const basketItems = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/items`);
