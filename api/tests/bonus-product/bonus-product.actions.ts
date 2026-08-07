import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import type { BonusItemPayload } from './bonus-product.data';
import * as Endpoints from './bonus-product.endpoints';

const authed = (accessToken: string, data?: unknown, params: Record<string, string> = {}) => ({
  params: withSite(params),
  headers: bearer(accessToken),
  ...(data !== undefined ? { data } : {}),
});

export const createBasket = (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> => request.post(Endpoints.baskets(), authed(accessToken, {}));

export const addQualifier = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  productId: string,
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(basketId), authed(accessToken, [{ productId, quantity: 1 }]));

export const getBasket = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> => request.get(Endpoints.basket(basketId), authed(accessToken));

export const getEligibleBonusProducts = (
  request: APIRequestContext,
  accessToken: string,
  promotionId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.eligibleBonusProducts(promotionId), {
    headers: bearer(accessToken),
  });

export const hydrateBonusProduct = (
  request: APIRequestContext,
  accessToken: string,
  productId: string,
): Promise<APIResponse> =>
  request.get(
    Endpoints.product(productId),
    authed(accessToken, undefined, {
      allImages: 'false',
      expand: 'variations,promotions',
    }),
  );

export const addBonusItem = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  payload: BonusItemPayload,
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(basketId), authed(accessToken, [payload]));
