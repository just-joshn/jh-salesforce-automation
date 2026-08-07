import type { APIRequestContext, APIResponse } from '@playwright/test';
import { env } from '../../../config/env';
import { orderExpand } from '../../support/oms';
import { bearer, withSite } from '../../support/scapi';
import type { CancelOrderBody } from './cancel-oms-order.data';
import * as Endpoints from './cancel-oms-order.endpoints';

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

export const cancelOrder = (
  request: APIRequestContext,
  accessToken: string,
  orderNo: string,
  body: CancelOrderBody,
): Promise<APIResponse> => request.post(Endpoints.cancelOrder(orderNo), authed(accessToken, body));
