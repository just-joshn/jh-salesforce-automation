import type { APIRequestContext, Request } from '@playwright/test';
import { env } from '../../../config/env';
import type {
  OmsReasonCode,
  OrderItemResource,
  OrderResource,
  ShopperCredentials,
} from '../../../api/support/oms';
import { configuredShopper, omsPreflight, readOwnedOrder } from '../../../api/support/oms';

// CUJ 23 — Return eligible order items.
//
// Returnability is Order Management's answer, not the storefront's guess. A line
// is returnable exactly while OMS reports a positive quantityAvailableToReturn.
// The shopper's chosen quantity is validated against that same limit before
// anything is submitted.

const ORDERS = 'checkout/shopper-orders/v1';

/** A line Order Management still accepts a return for. */
export interface ReturnableLine {
  itemId: string;
  availableToReturn: number;
}

export interface ReturnItemsCondition {
  met: boolean;
  /** Why the journey does or does not exist here, for the skip annotation. */
  reason: string;
  orderNo: string;
  credentials: ShopperCredentials;
  returnable: ReturnableLine[];
  reasonCodes: OmsReasonCode[];
}

const unmet = (reason: string): ReturnItemsCondition => ({
  met: false,
  reason,
  orderNo: '',
  credentials: configuredShopper(),
  returnable: [],
  reasonCodes: [],
});

/** The line the journey returns, which the met condition guarantees exists. */
export const intendedLine = (condition: ReturnItemsCondition): ReturnableLine => {
  const [first] = condition.returnable;
  if (first === undefined) throw new Error('the met condition guaranteed a returnable line');
  return first;
};

const returnableLine = (item: OrderItemResource): ReturnableLine[] => {
  const available = item.omsData?.quantityAvailableToReturn ?? 0;
  if (item.itemId === undefined) return [];
  return available > 0 ? [{ itemId: item.itemId, availableToReturn: available }] : [];
};

const returnableFrom = (items: OrderItemResource[]): ReturnableLine[] =>
  items.flatMap(returnableLine);

const blockingReason = (
  order: OrderResource,
  orderNo: string,
  customerId: string,
): string | undefined => {
  if (order.omsData === undefined) {
    return (
      `order ${orderNo} carries no omsData, so Order Management has not ingested it and the ` +
      'order detail page exposes no return for it'
    );
  }
  if (order.customerInfo?.customerId !== customerId) {
    return `order ${orderNo} is not owned by the configured shopper, so the return stays hidden`;
  }
  return undefined;
};

const seedReason =
  'E2E_OMS_RETURN_ORDER_NO is empty. This journey needs an OMS-backed order holding a returnable ' +
  'quantity, which only exists once the order has been fulfilled — OMS ingestion is not ' +
  'retroactive and cannot advance an order on demand, so the order is seeded, not placed here';

const noReasonsReason =
  'the OMS metadata resource offers no returnReasonCodes, so no return can be submitted: the ' +
  'modal requires a reason per line before it will accept one';

const readyCondition = (
  order: OrderResource,
  orderNo: string,
  credentials: ShopperCredentials,
  reasonCodes: OmsReasonCode[],
): ReturnItemsCondition => {
  const returnable = returnableFrom(order.productItems ?? []);
  if (returnable.length === 0) {
    return unmet(
      `no line on order ${orderNo} carries a positive quantityAvailableToReturn, so Order ` +
        'Management reports nothing on it as returnable',
    );
  }
  if (reasonCodes.length === 0) return unmet(noReasonsReason);
  return {
    met: true,
    reason: 'Order Management is active and the seeded order holds a returnable quantity',
    orderNo,
    credentials,
    returnable,
    reasonCodes,
  };
};

/**
 * Whether this storefront can run the journey, proven against the commerce
 * services before the browser starts. It needs three things: Order Management
 * connected to the site, a seeded order the configured shopper owns that holds a
 * returnable quantity, and reasons for the shopper to pick from.
 */
export const returnItemsCondition = async (
  request: APIRequestContext,
): Promise<ReturnItemsCondition> => {
  const pre = await omsPreflight(request, env.oms.returnOrderNo, seedReason);
  if (!pre.ready) return unmet(pre.reason);

  const lookup = await readOwnedOrder(request, pre.credentials, pre.orderNo);
  if (!lookup.found) return unmet(lookup.reason);

  const blocked = blockingReason(lookup.order, pre.orderNo, lookup.customerId);
  if (blocked !== undefined) return unmet(blocked);

  return readyCondition(
    lookup.order,
    pre.orderNo,
    pre.credentials,
    pre.activation.returnReasonCodes,
  );
};

/** The reason the modal preselects on every checked line, which is the default one. */
export const defaultReason = (reasonCodes: OmsReasonCode[]): string =>
  reasonCodes.find((code) => code.default === true)?.reason ?? '';

export const orderActionsHeading = 'Order Actions';
export const orderDetailTitle = 'Order Details';
export const startReturnLabel = 'Return Items';
export const reviewReturnLabel = 'Review Return';
export const submitReturnLabel = 'Submit Return';
export const reviewStepTitle = 'Review your return';
export const returnSuccessTitle = 'Return submitted';
export const returnSuccessDescription = "We'll email a return label shortly.";

export const returnModalTitle = (orderNo: string): string => `Return items from order #${orderNo}`;

export const availableToReturnLabel = (count: number): string =>
  `Up to ${count} ${count === 1 ? 'unit' : 'units'} available to return`;

export const reviewQuantityLabel = (count: number): string => `Quantity: ${count}`;

export const reviewReasonLabel = (reason: string): string => `Reason: ${reason}`;

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

/** Shopper Orders: the OMS return the storefront submits. */
export const returnCall =
  (orderNo: string) =>
  (request: Request): boolean =>
    request.method() === 'POST' &&
    pathOf(request).endsWith(`/orders/${orderNo}/actions/oms-return-order`);

export const expandValues = (request: Request): string[] =>
  (new URL(request.url()).searchParams.get('expand') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

/** One submitted return line, as the storefront sends it. */
export interface SubmittedReturnLine {
  itemId?: string;
  quantity?: number;
  /** Omitted by the storefront when the shopper kept the default reason. */
  reason?: string;
}

export const submittedLines = (request: Request): SubmittedReturnLine[] =>
  (request.postDataJSON() as { productItems?: SubmittedReturnLine[] } | null)?.productItems ?? [];
