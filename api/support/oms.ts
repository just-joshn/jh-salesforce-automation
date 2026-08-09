import type { APIRequestContext, APIResponse } from '@playwright/test';

import { env } from '../../config/env';
import { bearer, shopperApiUrl, withSite } from './scapi';
import type { OmsMetaData, OmsReasonCode, Order } from './scapi-types';

const OMS_NOT_ACTIVE_FAULT =
  'https://api.commercecloud.salesforce.com/documentation/error/v1/errors/oms-not-active';

const OMS_METADATA_PATH = 'orders/oms-meta-data';
const ORDER_EXPANSIONS = 'oms,oms_shipments';

type ApiRecord = Readonly<Record<string, unknown>>;

export type OmsAvailability =
  | { readonly kind: 'active'; readonly metadata: OmsMetaData }
  | { readonly kind: 'gated'; readonly fault: OmsNotActiveFault; readonly reason: string };

export interface OmsNotActiveFault {
  readonly detail: string;
  readonly title: string;
  readonly type: typeof OMS_NOT_ACTIVE_FAULT;
}

export type SeededOmsOrder = 'tracking' | 'cancel' | 'return';

export type SeededOmsOrderNumber =
  | { readonly kind: 'configured'; readonly orderNo: string; readonly variable: string }
  | { readonly kind: 'not-configured'; readonly reason: string; readonly variable: string };

const isRecord = (value: unknown): value is ApiRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isReasonCode = (value: unknown): value is OmsReasonCode =>
  isRecord(value) && typeof value.reason === 'string' && typeof value.default === 'boolean';

const isOmsMetaData = (value: unknown): value is OmsMetaData =>
  isRecord(value) &&
  Array.isArray(value.cancelReasonCodes) &&
  value.cancelReasonCodes.every(isReasonCode) &&
  Array.isArray(value.returnReasonCodes) &&
  value.returnReasonCodes.every(isReasonCode);

const isOmsNotActiveFault = (value: unknown): value is OmsNotActiveFault =>
  isRecord(value) &&
  value.type === OMS_NOT_ACTIVE_FAULT &&
  typeof value.title === 'string' &&
  typeof value.detail === 'string';

const rawResponse = async (response: APIResponse): Promise<unknown> => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const unexpectedResponse = (operation: string, status: number, payload: unknown): Error =>
  new Error(`${operation} returned HTTP ${status}: ${JSON.stringify(payload)}`);

const gatedReason = (fault: OmsNotActiveFault): string =>
  `${fault.detail} Link an Order Management org to this Commerce instance, set Administration > Global Preferences > Salesforce Order Management Integration Administration to Active, and set Merchant Tools > Site Preferences > Order > Order Management Settings > Include in Order Management to Yes.`;

const parseOmsAvailability = (status: number, payload: unknown): OmsAvailability => {
  if (status === 200 && isOmsMetaData(payload)) {
    return { kind: 'active', metadata: payload };
  }

  if (status === 409 && isOmsNotActiveFault(payload)) {
    return { kind: 'gated', fault: payload, reason: gatedReason(payload) };
  }

  throw unexpectedResponse('OMS metadata probe', status, payload);
};

const seededOrderSetting = (
  order: SeededOmsOrder,
): Readonly<{ readonly value: string | undefined; readonly variable: string }> => {
  switch (order) {
    case 'tracking':
      return { value: env.E2E_OMS_TRACKING_ORDER_NO, variable: 'E2E_OMS_TRACKING_ORDER_NO' };
    case 'cancel':
      return { value: env.E2E_OMS_CANCEL_ORDER_NO, variable: 'E2E_OMS_CANCEL_ORDER_NO' };
    case 'return':
      return { value: env.E2E_OMS_RETURN_ORDER_NO, variable: 'E2E_OMS_RETURN_ORDER_NO' };
  }
};

export const probeOmsAvailability = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<OmsAvailability> => {
  const response = await request.get(shopperApiUrl('checkout/shopper-orders', OMS_METADATA_PATH), {
    headers: bearer(accessToken),
    params: withSite(),
  });
  return parseOmsAvailability(response.status(), await rawResponse(response));
};

export const seededOmsOrderNumber = (order: SeededOmsOrder): SeededOmsOrderNumber => {
  const setting = seededOrderSetting(order);
  if (setting.value) {
    return { kind: 'configured', orderNo: setting.value, variable: setting.variable };
  }

  return {
    kind: 'not-configured',
    reason: `${setting.variable} is not configured; seed this order against an Order-Management-active storefront.`,
    variable: setting.variable,
  };
};

// These are seeded: tracking URLs appear only after fulfillment, returns only after shipment, OMS
// ingestion is not retroactive, and cancellation needs an unallocated order that a fresh order races.
export const readOmsExpandedOrder = async (
  request: APIRequestContext,
  orderNo: string,
  accessToken: string,
): Promise<Order> => {
  const response = await request.get(
    shopperApiUrl('checkout/shopper-orders', `orders/${encodeURIComponent(orderNo)}`),
    {
      headers: bearer(accessToken),
      params: withSite({ expand: ORDER_EXPANSIONS }),
    },
  );
  const payload = await rawResponse(response);
  if (response.status() !== 200 || !isRecord(payload)) {
    throw unexpectedResponse(`OMS-expanded order read for ${orderNo}`, response.status(), payload);
  }

  return payload;
};
