import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import * as Endpoints from './pickup-availability.endpoints';

export const openCategory = (
  request: APIRequestContext,
  accessToken: string,
  categoryId: string,
  limit: number,
): Promise<APIResponse> => {
  const params = new URLSearchParams(withSite({ limit: String(limit) }));
  params.append('refine', `cgid=${categoryId}`);
  return request.get(Endpoints.productSearch(), {
    params,
    headers: bearer(accessToken),
  });
};

export const openProduct = (
  request: APIRequestContext,
  accessToken: string,
  productId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.product(productId), {
    params: withSite({ allImages: 'false', expand: 'availability,variations' }),
    headers: bearer(accessToken),
  });

export const selectStoreVariant = (
  request: APIRequestContext,
  accessToken: string,
  productId: string,
  inventoryId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.product(productId), {
    params: withSite({
      allImages: 'false',
      expand: 'availability',
      inventoryIds: inventoryId,
    }),
    headers: bearer(accessToken),
  });
