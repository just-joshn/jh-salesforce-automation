import type { APIRequestContext, APIResponse } from '@playwright/test';

import { readOmsExpandedOrder } from '../../support/oms';
import { bearer, withSite } from '../../support/scapi';
import type { Order } from '../../support/scapi-types';
import type { ReturnRequest } from './order-returns.data';
import * as Endpoints from './order-returns.endpoints';

export const readOmsMetadata = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.get(Endpoints.omsMetadata(), { headers: bearer(accessToken), params: withSite() });

export const readReturnOrder = async (
  request: APIRequestContext,
  orderNo: string,
  accessToken: string,
): Promise<Order> => readOmsExpandedOrder(request, orderNo, accessToken);

export const submitOmsReturn = async (
  request: APIRequestContext,
  orderNo: string,
  accessToken: string,
  body: ReturnRequest,
): Promise<APIResponse> =>
  request.post(Endpoints.returnOrder(orderNo), {
    data: body,
    headers: bearer(accessToken),
    params: withSite(),
  });
