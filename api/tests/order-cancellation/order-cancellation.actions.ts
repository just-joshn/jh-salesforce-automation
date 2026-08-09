import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, withSite } from '../../support/scapi';
import { omsOrderExpansion } from './order-cancellation.data';
import type { CancellationRequest } from './order-cancellation.data';
import * as Endpoints from './order-cancellation.endpoints';

export const readOmsMetadata = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.get(Endpoints.omsMetadata(), { headers: bearer(accessToken), params: withSite() });

export const readCancellableOrder = async (
  request: APIRequestContext,
  orderNo: string,
  accessToken: string,
): Promise<APIResponse> =>
  request.get(Endpoints.order(orderNo), {
    headers: bearer(accessToken),
    params: withSite({ expand: omsOrderExpansion }),
  });

export const cancelOmsOrder = async (
  request: APIRequestContext,
  orderNo: string,
  accessToken: string,
  body: CancellationRequest,
): Promise<APIResponse> =>
  request.post(Endpoints.cancelOrder(orderNo), {
    data: body,
    headers: bearer(accessToken),
    params: withSite(),
  });
