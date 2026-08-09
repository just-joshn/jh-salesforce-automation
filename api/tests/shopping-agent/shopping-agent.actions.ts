import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, withSite } from '../../support/scapi';
import { productSearchParams } from './shopping-agent.data';
import * as Endpoints from './shopping-agent.endpoints';

export const readShopperConfigurations = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.get(Endpoints.shopperConfigurations(), {
    headers: bearer(accessToken),
    params: withSite(),
  });

export const searchProducts = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.get(Endpoints.productSearch(), {
    headers: bearer(accessToken),
    params: withSite(productSearchParams),
  });
