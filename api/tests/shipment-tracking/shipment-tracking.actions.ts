import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, withSite } from '../../support/scapi';
import type { Order } from '../../support/scapi-types';
import { omsOrderExpansions } from './shipment-tracking.data';
import * as Endpoints from './shipment-tracking.endpoints';

type ApiRecord = Readonly<Record<string, unknown>>;

export interface TrackingOrderRead {
  readonly response: APIResponse;
  readonly order: Order;
}

const isRecord = (value: unknown): value is ApiRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const readOmsMetadata = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.get(Endpoints.omsMetadata(), { headers: bearer(accessToken), params: withSite() });

export const readTrackingOrder = async (
  request: APIRequestContext,
  orderNo: string,
  accessToken: string,
): Promise<TrackingOrderRead> => {
  const response = await request.get(Endpoints.order(orderNo), {
    headers: bearer(accessToken),
    params: withSite({ expand: omsOrderExpansions }),
  });
  const payload: unknown = await response.json();
  if (!isRecord(payload)) {
    throw new Error('Tracking order response is not an object');
  }

  return { response, order: payload };
};
