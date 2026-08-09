import type { APIRequestContext, APIResponse } from '@playwright/test';

import { readOmsExpandedOrder } from '../../support/oms';
import { bearer, withSite } from '../../support/scapi';
import type { Order } from '../../support/scapi-types';
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
): Promise<Order> => readOmsExpandedOrder(request, orderNo, accessToken);

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
