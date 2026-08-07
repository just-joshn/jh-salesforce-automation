import type { APIRequestContext, APIResponse } from '@playwright/test';
import { env } from '../../../config/env';
import { bearer, withSite } from '../../support/scapi';
import type {
  EinsteinClickBody,
  EinsteinImpressionBody,
  WishlistItemBody,
  WishlistListBody,
} from './recommendation-discovery.data';
import * as Endpoints from './recommendation-discovery.endpoints';

const authed = (accessToken: string, data?: unknown, params: Record<string, string> = {}) => ({
  params: withSite(params),
  headers: bearer(accessToken),
  ...(data !== undefined ? { data } : {}),
});

const einstein = (data: EinsteinImpressionBody | EinsteinClickBody) => ({
  headers: { 'x-cq-client-id': env.einstein.clientId, 'content-type': 'application/json' },
  data,
});

export const hydrateProducts = (
  request: APIRequestContext,
  accessToken: string,
  productIds: string[],
): Promise<APIResponse> =>
  request.get(
    Endpoints.products(),
    authed(accessToken, undefined, { ids: productIds.join(','), allImages: 'false' }),
  );

export const recordImpression = (
  request: APIRequestContext,
  accessToken: string,
  body: EinsteinImpressionBody,
): Promise<APIResponse> => {
  void accessToken;
  return request.post(Endpoints.einsteinActivity('viewReco'), einstein(body));
};

export const recordClick = (
  request: APIRequestContext,
  accessToken: string,
  body: EinsteinClickBody,
): Promise<APIResponse> => {
  void accessToken;
  return request.post(Endpoints.einsteinActivity('clickReco'), einstein(body));
};

export const getProductLists = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
): Promise<APIResponse> => request.get(Endpoints.productLists(customerId), authed(accessToken));

export const createWishlist = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
  body: WishlistListBody,
): Promise<APIResponse> =>
  request.post(Endpoints.productLists(customerId), authed(accessToken, body));

export const addWishlistItem = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
  listId: string,
  body: WishlistItemBody,
): Promise<APIResponse> =>
  request.post(Endpoints.productListItems(customerId, listId), authed(accessToken, body));

export const getWishlistItem = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
  listId: string,
  itemId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.productListItem(customerId, listId, itemId), authed(accessToken));
