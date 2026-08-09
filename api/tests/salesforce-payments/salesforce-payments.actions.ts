import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, withSite } from '../../support/scapi';
import * as Endpoints from './salesforce-payments.endpoints';

export const readShopperConfigurations = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.get(Endpoints.shopperConfigurations(), {
    headers: bearer(accessToken),
    params: withSite(),
  });
