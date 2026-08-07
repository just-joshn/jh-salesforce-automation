import { env } from '../../../config/env';
import { einsteinActivityPath } from '../../support/einstein';
import { shopperApiUrl } from '../../support/scapi';

const CUSTOMERS = 'customer/shopper-customers/v1';
const PRODUCTS = 'product/shopper-products/v1';
const SEARCH = 'search/shopper-search/v1';

export const products = (): string => shopperApiUrl(PRODUCTS, 'products');

export const productSearch = (): string => shopperApiUrl(SEARCH, 'product-search');

export const customers = (): string => shopperApiUrl(CUSTOMERS, 'customers');

export const productLists = (customerId: string): string =>
  shopperApiUrl(CUSTOMERS, `customers/${encodeURIComponent(customerId)}/product-lists`);

export const productListItems = (customerId: string, listId: string): string =>
  shopperApiUrl(
    CUSTOMERS,
    `customers/${encodeURIComponent(customerId)}/product-lists/${encodeURIComponent(listId)}/items`,
  );

export const productListItem = (customerId: string, listId: string, itemId: string): string =>
  shopperApiUrl(
    CUSTOMERS,
    `customers/${encodeURIComponent(customerId)}/product-lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`,
  );

// Einstein is separate from SCAPI and uses its own host, site id, and client header.
export const einsteinActivity = (activity: string): string =>
  `${env.einstein.host}${einsteinActivityPath(activity)}`;
