import { shopperApiUrl, slasUrl } from '../../support/scapi';

export const customers = (): string => shopperApiUrl('customer/shopper-customers', 'customers');

export const resetToken = (): string =>
  slasUrl('oauth2/password/reset');
