import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import type { RegistrationInput } from './identity-account.data';
import {
  basketItemRequest,
  passwordChangeRequest,
  registrationRequest,
} from './identity-account.data';
import * as Endpoints from './identity-account.endpoints';

const authed = (accessToken: string, data?: unknown) => ({
  params: withSite(),
  headers: bearer(accessToken),
  ...(data !== undefined ? { data } : {}),
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

export const readCustomerBaskets = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
): Promise<APIResponse> => request.get(Endpoints.customerBaskets(customerId), authed(accessToken));

export const changePassword = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
  currentPassword: string,
  nextPassword: string,
): Promise<APIResponse> =>
  request.put(
    Endpoints.customerPassword(customerId),
    authed(accessToken, passwordChangeRequest(currentPassword, nextPassword)),
  );
