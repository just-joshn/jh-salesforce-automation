import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import type { AddItem } from './cart.data';
import * as Endpoints from './cart.endpoints';

export const createBasket = (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.post(Endpoints.baskets(), { params: withSite(), headers: bearer(accessToken), data: {} });

export const addItems = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  items: AddItem[],
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(basketId), {
    params: withSite(),
    headers: bearer(accessToken),
    data: items,
  });

export const getBasket = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.basket(basketId), { params: withSite(), headers: bearer(accessToken) });

export const updateItemQuantity = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  itemId: string,
  quantity: number,
): Promise<APIResponse> =>
  request.patch(Endpoints.basketItem(basketId, itemId), {
    params: withSite(),
    headers: bearer(accessToken),
    data: { quantity },
  });

export const removeItem = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  itemId: string,
): Promise<APIResponse> =>
  request.delete(Endpoints.basketItem(basketId, itemId), {
    params: withSite(),
    headers: bearer(accessToken),
  });
