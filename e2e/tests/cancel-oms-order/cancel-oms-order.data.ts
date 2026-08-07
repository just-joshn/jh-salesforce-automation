import type { APIRequestContext, Request } from '@playwright/test';
import { env } from '../../../config/env';
import type {
  OmsReasonCode,
  OrderItemResource,
  OrderResource,
  ShopperCredentials,
} from '../../../api/support/oms';
import { configuredShopper, omsPreflight, readOwnedOrder } from '../../../api/support/oms';

// CUJ 22 — Cancel eligible OMS order.
//
// Cancellation is offered on identity and eligibility, both read from the order
// itself. The shopper has to be registered and own it, and every line has to be
// cancellable in full.
//
// Order Management is the authority. The storefront submits the cancellation and
// shows what OMS answered.

const ORDERS = 'checkout/shopper-orders/v1';

export interface CancelOrderCondition {
  met: boolean;
  /** Why the journey does or does not exist here, for the skip annotation. */
  reason: string;
  orderNo: string;
  credentials: ShopperCredentials;
  /** Cancellation reasons the shop offers; empty means the modal asks for none. */
  reasonCodes: OmsReasonCode[];
}

const unmet = (reason: string): CancelOrderCondition => ({
  met: false,
  reason,
  orderNo: '',
  credentials: configuredShopper(),
  reasonCodes: [],
});

/**
 * A line is cancellable in full when OMS has not committed any of it yet.
 *
 * Both quantities must be real numbers. That is stricter than the page's own
 * gate, which compares the two fields directly. A line carrying neither reads as
 * equal there, so the page would offer a cancellation that OMS then refuses.
 * This journey needs one that succeeds.
 */
const cancellableInFull = (item: OrderItemResource): boolean => {
  const oms = item.omsData;
  if (oms === undefined) return false;
  return (
    Number.isFinite(oms.quantityAvailableToCancel) &&
    oms.quantityAvailableToCancel === oms.quantityOrdered
  );
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
  'full, and OMS ingestion is neither retroactive nor instant, so the order is seeded rather than ' +
  'placed here — a freshly placed order races Order Management allocating it';

/**
 * Whether this storefront can run the journey, proven against the commerce
 * services before the browser starts. It needs two things: Order Management
 * connected to the site, and a seeded order the configured shopper owns that is
 * still fully cancellable.
 */
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
    reasonCodes: pre.activation.cancelReasonCodes,
  };
};

/** The reason the modal preselects, which is the one marked default. */
export const defaultReason = (reasonCodes: OmsReasonCode[]): string =>
  reasonCodes.find((code) => code.default === true)?.reason ?? '';

export const orderActionsHeading = 'Order Actions';
export const orderDetailTitle = 'Order Details';
export const cancelOrderLabel = 'Cancel Order';
export const confirmCancellationLabel = 'Confirm Cancellation';
export const keepOrderLabel = 'Keep Order';
export const reasonFieldLabel = 'Reason';
export const cancelImpactText = 'Cancel the entire order.';
export const cancelSuccessTitle = 'Order cancelled';
export const cancelSuccessDescription = 'Your order was cancelled successfully.';

/** The badge the order carries once cancellation is acknowledged. */
export const cancelledBadgeText = 'Canceled';

export const cancelModalHeading = (orderNo: string): string => `Cancel order ${orderNo}`;

export const orderNumberLabel = (orderNo: string): string => `Order Number: ${orderNo}`;

export const orderDetailUrlPattern = (orderNo: string): RegExp =>
  new RegExp(`/account/orders/${orderNo}$`);

export const orderHistoryUrlPattern = /\/account\/orders$/;
export const accountUrlPattern = /\/account\/?$/;

const pathOf = (request: Request): string => new URL(request.url()).pathname;

export const orderDetailCall =
  (orderNo: string) =>
  (request: Request): boolean =>
    request.method() === 'GET' &&
    pathOf(request).includes(`/${ORDERS}/`) &&
    pathOf(request).endsWith(`/orders/${orderNo}`);

/** Shopper Orders: the OMS cancellation the storefront submits. */
export const cancelCall =
  (orderNo: string) =>
  (request: Request): boolean =>
    request.method() === 'POST' &&
    pathOf(request).endsWith(`/orders/${orderNo}/actions/oms-cancel-order`);

export const expandValues = (request: Request): string[] =>
  (new URL(request.url()).searchParams.get('expand') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

/** The reason a cancellation was submitted with, if the shop asked for one. */
export const submittedReason = (request: Request): string | undefined =>
  (request.postDataJSON() as { reason?: string } | null)?.reason;
