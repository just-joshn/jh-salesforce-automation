import { composeOmsSkipReason } from '../../support/gates';
import type { OmsAvailability, SeededOmsOrderNumber } from '../../support/oms';
import { required } from '../../support/scapi';
import type { Fault, OmsReasonCode, Order, OrderProductItem } from '../../support/scapi-types';

interface CancellationQuantities {
  readonly quantityAvailableToCancel: number;
  readonly quantityCanceled: number;
  readonly quantityOrdered: number;
  readonly status: string;
}

type DataRecord = Readonly<Record<string, unknown>>;

export interface CancellationRequest {
  readonly reason: string;
}

export type CancellationJourneyGate =
  | { readonly kind: 'ready'; readonly orderNo: string; readonly reason: string }
  | { readonly kind: 'skip'; readonly reason: string };

export type InactiveOmsFault = Fault & { readonly type: string };

export const omsNotActiveFaultSuffix = '/oms-not-active';
export const omsOrderExpansion = 'oms,oms_shipments';

const isRecord = (value: unknown): value is DataRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasCancellationQuantities = (value: unknown): value is CancellationQuantities =>
  isRecord(value) &&
  typeof value.quantityAvailableToCancel === 'number' &&
  typeof value.quantityCanceled === 'number' &&
  typeof value.quantityOrdered === 'number' &&
  typeof value.status === 'string';

export const isCancellationEligible = (item: OrderProductItem): boolean => {
  const omsData = item.omsData;
  return (
    hasCancellationQuantities(omsData) &&
    omsData.quantityAvailableToCancel > 0 &&
    omsData.quantityAvailableToCancel === omsData.quantityOrdered
  );
};

export const hasOnlyCancellationEligibleItems = (
  items: readonly OrderProductItem[] | undefined,
): boolean => items !== undefined && items.length > 0 && items.every(isCancellationEligible);

export const requireOrderPayload = (value: unknown): Order => {
  if (!isRecord(value)) {
    throw new Error('Shopper Orders response does not match Order');
  }

  return value;
};

export const orderNumber = (order: Order): string => required(order.orderNo, 'order.orderNo');

const hasCanceledItemState = (item: OrderProductItem): boolean => {
  const omsData = item.omsData;
  return (
    hasCancellationQuantities(omsData) &&
    omsData.status === 'canceled' &&
    omsData.quantityAvailableToCancel === 0 &&
    omsData.quantityCanceled === omsData.quantityOrdered
  );
};

export const hasCanceledOrderState = (order: Order): boolean =>
  order.status === 'cancelled' &&
  order.productItems !== undefined &&
  order.productItems.length > 0 &&
  order.productItems.every(hasCanceledItemState);

const preferredReason = (codes: readonly OmsReasonCode[]): string | undefined =>
  codes.find((code) => code.default)?.reason ?? codes[0]?.reason;

export const composeCancellationSkipReason = (
  availability: OmsAvailability,
  order: SeededOmsOrderNumber,
): string => composeOmsSkipReason(availability, order);

export const cancellationJourneyGate = (
  availability: OmsAvailability,
  order: SeededOmsOrderNumber,
): CancellationJourneyGate => {
  if (availability.kind === 'active' && order.kind === 'configured') {
    const reason = preferredReason(availability.metadata.cancelReasonCodes);
    if (reason) {
      return { kind: 'ready', orderNo: order.orderNo, reason };
    }
    throw new Error('OMS metadata contains no cancellation reason codes');
  }

  return { kind: 'skip', reason: composeCancellationSkipReason(availability, order) };
};

export const cancellationRequest = (reason: string): CancellationRequest => ({ reason });

const isInactiveOmsFault = (value: unknown): value is InactiveOmsFault =>
  isRecord(value) && typeof value.type === 'string';

export const requireInactiveOmsFault = (value: unknown): InactiveOmsFault => {
  if (!isInactiveOmsFault(value)) {
    throw new Error('OMS metadata probe returned an invalid fault payload');
  }

  return value;
};
