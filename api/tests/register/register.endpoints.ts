import { shopperApiUrl } from '../../support/scapi';

export const customers = (): string => shopperApiUrl('customer/shopper-customers/v1', 'customers');
