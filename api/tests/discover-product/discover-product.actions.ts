import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import * as Endpoints from './discover-product.endpoints';

const authed = (accessToken: string, params: Record<string, string> = {}) => ({
  params: withSite(params),
  headers: bearer(accessToken),
});

export const searchProducts = (
  request: APIRequestContext,
  accessToken: string,
  term: string,
): Promise<APIResponse> =>
  request.get(Endpoints.productSearch(), authed(accessToken, { q: term, limit: '25' }));

export const openProduct = (
  request: APIRequestContext,
  accessToken: string,
  productId: string,
): Promise<APIResponse> =>
  request.get(
    Endpoints.product(productId),
    authed(accessToken, {
      allImages: 'true',
      expand: 'images,prices,promotions,availability,variations',
    }),
  );
