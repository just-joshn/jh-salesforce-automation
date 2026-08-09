import type { APIRequestContext, APIResponse } from '@playwright/test';

import { readOmsExpandedOrder } from '../../support/oms';
import { bearer, withSite } from '../../support/scapi';
import type { Order } from '../../support/scapi-types';
import * as Endpoints from './shipment-tracking.endpoints';

export const readOmsMetadata = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.get(Endpoints.omsMetadata(), { headers: bearer(accessToken), params: withSite() });

export const readTrackingOrder = async (
  request: APIRequestContext,
  orderNo: string,
  accessToken: string,
): Promise<Order> => readOmsExpandedOrder(request, orderNo, accessToken);
