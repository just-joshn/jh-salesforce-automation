import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import * as Endpoints from './cart-delivery.endpoints';

export const getProduct = (
  request: APIRequestContext,
  accessToken: string,
  productId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.product(productId), { params: withSite(), headers: bearer(accessToken) });

export const createBasket = (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.post(Endpoints.baskets(), { params: withSite(), headers: bearer(accessToken), data: {} });

export const addItem = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  productId: string,
  quantity: number,
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(basketId), {
    params: withSite(),
    headers: bearer(accessToken),
    data: [{ productId, quantity }],
  });

export const getBasket = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.basket(basketId), { params: withSite(), headers: bearer(accessToken) });
