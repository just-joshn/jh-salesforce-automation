import { shopperApiUrl } from '../../support/scapi';

const CONFIGURATIONS = 'configuration/shopper-configurations/v1';
const SEARCH = 'search/shopper-search/v1';

export const configurations = (): string => shopperApiUrl(CONFIGURATIONS, 'configurations');

export const productSearch = (): string => shopperApiUrl(SEARCH, 'product-search');
