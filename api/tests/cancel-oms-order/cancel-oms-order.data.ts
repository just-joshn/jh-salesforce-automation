import type { APIRequestContext } from '@playwright/test';
import { env } from '../../../config/env';
import type {
  OmsReasonCode,
  OrderItemResource,
  OrderResource,
  ShopperCredentials,
} from '../../support/oms';
import { configuredShopper, omsPreflight, readOwnedOrder } from '../../support/oms';

export interface CancelOrderCondition {
  met: boolean;
  reason: string;
  orderNo: string;
  credentials: ShopperCredentials;
  accessToken: string;
  reasonCodes: OmsReasonCode[];
}

const unmet = (reason: string): CancelOrderCondition => ({
  met: false,
  reason,
  orderNo: '',
  credentials: configuredShopper(),
  accessToken: '',
  reasonCodes: [],
});

const cancellableInFull = (item: OrderItemResource): boolean => {
  const oms = item.omsData;
  if (oms === undefined) return false;
  return (
    Number.isFinite(oms.quantityAvailableToCancel) &&
    oms.quantityAvailableToCancel === oms.quantityOrdered
  );
};

export const isCancellable = (order: OrderResource): boolean => {
  const items = order.productItems ?? [];
  return order.omsData !== undefined && items.length > 0 && items.every(cancellableInFull);
};

const itemsReason = (order: OrderResource, orderNo: string): string | undefined => {
  const items = order.productItems ?? [];
  if (items.length === 0) return `order ${orderNo} carries no lines, so there is nothing to cancel`;
  if (!items.every(cancellableInFull)) {
    return (
      `order ${orderNo} has at least one line Order Management has already committed ` +
      '(quantityAvailableToCancel is not the full quantityOrdered), so it is past cancellation'
    );
  }
  return undefined;
};

const blockingReason = (
  order: OrderResource,
  orderNo: string,
  customerId: string,
): string | undefined => {
  if (order.omsData === undefined) {
    return (
      `order ${orderNo} carries no omsData, so Order Management has not ingested it and the ` +
      'order detail page exposes no cancellation for it'
    );
  }
  if (order.customerInfo?.customerId !== customerId) {
    return `order ${orderNo} is not owned by the configured shopper, so cancellation stays hidden`;
  }
  return itemsReason(order, orderNo);
};

const seedReason =
  'E2E_OMS_CANCEL_ORDER_NO is empty. This journey needs an OMS-backed order still cancellable in ' +
  'full, and OMS ingestion is neither retroactive nor instant, so the order is seeded, not placed ' +
  'here; a freshly placed order races Order Management allocating it';

export const cancelOrderCondition = async (
  request: APIRequestContext,
): Promise<CancelOrderCondition> => {
  const pre = await omsPreflight(request, env.oms.cancelOrderNo, seedReason);
  if (!pre.ready) return unmet(pre.reason);
  const lookup = await readOwnedOrder(request, pre.credentials, pre.orderNo);
  if (!lookup.found) return unmet(lookup.reason);
  const blocked = blockingReason(lookup.order, pre.orderNo, lookup.customerId);
  if (blocked !== undefined) return unmet(blocked);
  return {
    met: true,
    reason: 'Order Management is active and the seeded order is still cancellable in full',
    orderNo: pre.orderNo,
    credentials: pre.credentials,
    accessToken: lookup.accessToken,
    reasonCodes: pre.activation.cancelReasonCodes,
  };
};

export const defaultReason = (reasonCodes: OmsReasonCode[]): string =>
  reasonCodes.find((code) => code.default === true)?.reason ?? '';

export interface CancelOrderBody {
  reason?: string;
}

export const cancellationBody = (reason: string): CancelOrderBody =>
  reason === '' ? {} : { reason };
