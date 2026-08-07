import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import * as Endpoints from './shopper-assistance.endpoints';

const authed = (accessToken: string, params: Record<string, string> = {}) => ({
  params: withSite(params),
  headers: bearer(accessToken),
});

export const readShopperConfigurations = (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> => request.get(Endpoints.configurations(), authed(accessToken));

export const searchProducts = (
  request: APIRequestContext,
  accessToken: string,
  term: string,
): Promise<APIResponse> =>
  request.get(Endpoints.productSearch(), authed(accessToken, { q: term, limit: '25' }));
