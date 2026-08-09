import { shopperApiUrl } from '../../support/scapi';

export const customers = (): string => shopperApiUrl('customer/shopper-customers', 'customers');

export const resetToken = (): string =>
  shopperApiUrl('customer/shopper-customers', 'customers/password/actions/create-reset-token');
