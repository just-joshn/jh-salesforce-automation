import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import type { RegistrationInput } from './wishlist.data';
import {
  basketItemRequest,
  registrationRequest,
  wishlistItemRequest,
  wishlistRequest,
} from './wishlist.data';
import * as Endpoints from './wishlist.endpoints';

const authed = (accessToken: string, data?: unknown) => ({
  params: withSite(),
  headers: bearer(accessToken),
  ...(data !== undefined ? { data } : {}),
});

const productRequest = (accessToken: string) => ({
  params: withSite({ allImages: 'false' }),
  headers: bearer(accessToken),
});

export const registerCustomer = (
  request: APIRequestContext,
  accessToken: string,
  input: RegistrationInput,
): Promise<APIResponse> =>
  request.post(Endpoints.customers(), authed(accessToken, registrationRequest(input)));

export const readCustomer = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
): Promise<APIResponse> => request.get(Endpoints.customer(customerId), authed(accessToken));

export const createWishlist = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
): Promise<APIResponse> =>
  request.post(Endpoints.customerProductLists(customerId), authed(accessToken, wishlistRequest()));

export const readWishlist = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
  listId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.customerProductList(customerId, listId), authed(accessToken));

export const addWishlistItem = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
  listId: string,
  productId: string,
): Promise<APIResponse> =>
  request.post(
    Endpoints.customerProductListItems(customerId, listId),
    authed(accessToken, wishlistItemRequest(productId)),
  );

export const readProduct = (
  request: APIRequestContext,
  accessToken: string,
  productId: string,
): Promise<APIResponse> => request.get(Endpoints.product(productId), productRequest(accessToken));

export const createBasket = (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> => request.post(Endpoints.baskets(), authed(accessToken, {}));

export const addProductToBasket = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  variantId: string,
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(basketId), authed(accessToken, basketItemRequest(variantId)));
