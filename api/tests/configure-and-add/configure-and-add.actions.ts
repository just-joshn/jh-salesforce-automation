import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import * as Endpoints from './configure-and-add.endpoints';

const authed = (accessToken: string, data?: unknown) => ({
  params: withSite(),
  headers: bearer(accessToken),
  ...(data === undefined ? {} : { data }),
});

export const openProduct = (
  request: APIRequestContext,
  accessToken: string,
  productId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.product(productId), {
    params: withSite({ allImages: 'false', expand: 'availability,variations' }),
    headers: bearer(accessToken),
  });

export const createBasket = (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> => request.post(Endpoints.baskets(), authed(accessToken, {}));

export const addConfiguredProduct = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  productItems: unknown,
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(basketId), authed(accessToken, productItems));

export const openCart = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> => request.get(Endpoints.basket(basketId), authed(accessToken));
