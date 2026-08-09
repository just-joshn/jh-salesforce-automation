import { env } from '../../../config/env';
import { shopperApiUrl } from '../../support/scapi';

const sfraRoute = (path: string): string => new URL(path, env.E2E_BASE_URL).toString();

export const basket = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets', `baskets/${encodeURIComponent(basketId)}`);

export const basketItems = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets', `baskets/${encodeURIComponent(basketId)}/items`);

export const baskets = (): string => shopperApiUrl('checkout/shopper-baskets', 'baskets');

export const sfraCart = (): string =>
  sfraRoute('/on/demandware.store/Sites-RefArchGlobal-Site/en_US/Cart-Show');

export const sfraHome = (): string =>
  sfraRoute('/on/demandware.store/Sites-RefArchGlobal-Site/en_US/Home-Show');

export const sfraLogin = (): string =>
  sfraRoute('/on/demandware.store/Sites-RefArchGlobal-Site/en_US/Login-Show');
