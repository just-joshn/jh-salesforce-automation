import type { APIRequestContext, APIResponse } from '@playwright/test';
import { env } from '../../../config/env';
import { orderExpand } from '../../support/oms';
import { bearer, withSite } from '../../support/scapi';
import type { ReturnOrderBody } from './return-oms-items.data';
import * as Endpoints from './return-oms-items.endpoints';

const authed = (accessToken: string, data?: unknown) => ({
  params: withSite({ locale: env.locale }),
  headers: bearer(accessToken),
  ...(data !== undefined ? { data } : {}),
});

export const openOrder = (
  request: APIRequestContext,
  accessToken: string,
  orderNo: string,
): Promise<APIResponse> =>
  request.get(Endpoints.order(orderNo), {
    ...authed(accessToken),
    params: withSite({ locale: env.locale, expand: orderExpand }),
  });

export const returnOrder = (
  request: APIRequestContext,
  accessToken: string,
  orderNo: string,
  body: ReturnOrderBody,
): Promise<APIResponse> => request.post(Endpoints.returnOrder(orderNo), authed(accessToken, body));
