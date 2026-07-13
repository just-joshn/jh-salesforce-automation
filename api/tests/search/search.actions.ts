import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import * as Endpoints from './search.endpoints';

export const searchProducts = (
  request: APIRequestContext,
  accessToken: string,
  term: string,
): Promise<APIResponse> =>
  request.get(Endpoints.productSearch(), {
    params: withSite({ q: term }),
    headers: bearer(accessToken),
  });

export const getProduct = (
  request: APIRequestContext,
  accessToken: string,
  productId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.product(productId), {
    params: withSite(),
    headers: bearer(accessToken),
  });
