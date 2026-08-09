import { shopperApiUrl } from '../../support/scapi';

export const shopperConfigurations = (): string =>
  shopperApiUrl('configuration/shopper-configurations', 'configurations');

export const productSearch = (): string => shopperApiUrl('search/shopper-search', 'product-search');
