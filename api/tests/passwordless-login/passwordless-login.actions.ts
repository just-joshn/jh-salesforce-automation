import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, withSite } from '../../support/scapi';
import type {
  BasketItemInput,
  CustomerRegistrationRequest,
  PasswordlessStartRequest,
} from './passwordless-login.data';
import * as Endpoints from './passwordless-login.endpoints';

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

export const readBasket = async (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> => request.get(Endpoints.basket(basketId), shopperOptions(accessToken));

export const registerCustomer = async (
  request: APIRequestContext,
  accessToken: string,
  body: CustomerRegistrationRequest,
): Promise<APIResponse> =>
  request.post(Endpoints.customers(), {
    ...shopperOptions(accessToken),
    data: body,
  });

export const requestPasswordlessLogin = async (
  request: APIRequestContext,
  authorization: string,
  input: PasswordlessStartRequest,
): Promise<APIResponse> =>
  request.post(Endpoints.passwordlessLogin(), {
    form: input,
    headers: { Authorization: authorization },
  });
