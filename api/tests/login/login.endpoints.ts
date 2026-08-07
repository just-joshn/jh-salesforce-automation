import { shopperApiUrl } from '../../support/scapi';

const CUSTOMERS = 'customer/shopper-customers/v1';

export const customer = (customerId: string): string =>
  shopperApiUrl(CUSTOMERS, `customers/${encodeURIComponent(customerId)}`);
