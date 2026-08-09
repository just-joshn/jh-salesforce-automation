import { shopperApiUrl } from '../../support/scapi';

export const shopperConfigurations = (): string =>
  shopperApiUrl('configuration/shopper-configurations', 'configurations');
