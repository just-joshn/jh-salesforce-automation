import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, withSite } from '../../support/scapi';
import type { BasketItemInput, RouteProbe } from './hybrid-continuity.data';
import * as Endpoints from './hybrid-continuity.endpoints';

const shopperOptions = (accessToken: string) => ({
  headers: bearer(accessToken),
  params: withSite(),
});

export const addProductToBasket = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketItemInput,
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(input.basketId), {
    ...shopperOptions(accessToken),
    data: input.body,
  });

export const createBasket = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.post(Endpoints.baskets(), {
    ...shopperOptions(accessToken),
    data: {},
  });

export const probeSfraRoute = async (
  request: APIRequestContext,
  url: string,
): Promise<RouteProbe> => {
  const response = await request.get(url);
  if (response.status() >= 500) {
    throw new Error(`SFRA route probe failed with HTTP ${response.status()}: ${url}`);
  }

  return { status: response.status(), url };
};

export const readBasket = async (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> => request.get(Endpoints.basket(basketId), shopperOptions(accessToken));
