import type { APIRequestContext, APIResponse } from '@playwright/test';
import { env } from '../../../config/env';
import { orderExpand } from '../../support/oms';
import { bearer, withSite } from '../../support/scapi';
import * as Endpoints from './track-shipment.endpoints';

const authed = (accessToken: string) => ({
  params: withSite({ locale: env.locale, expand: orderExpand }),
  headers: bearer(accessToken),
});

export const openOrder = (
  request: APIRequestContext,
  accessToken: string,
  orderNo: string,
): Promise<APIResponse> => request.get(Endpoints.order(orderNo), authed(accessToken));
