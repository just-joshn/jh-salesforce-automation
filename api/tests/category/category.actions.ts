import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import * as Endpoints from './category.endpoints';

export const getCategory = (
  request: APIRequestContext,
  accessToken: string,
  categoryId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.category(categoryId), {
    params: withSite(),
    headers: bearer(accessToken),
  });

export const searchByCategory = (
  request: APIRequestContext,
  accessToken: string,
  categoryId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.productSearch(), {
    params: withSite({ refine: `cgid=${categoryId}` }),
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
