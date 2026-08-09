import type { OmsAvailability, SeededOmsOrderNumber } from '../../support/oms';
import type { Fault, OmsReasonCode, OrderProductItem } from '../../support/scapi-types';

interface CancellationQuantities {
  readonly quantityAvailableToCancel: number;
  readonly quantityOrdered: number;
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

const isRecord = (value: unknown): value is DataRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasCancellationQuantities = (value: unknown): value is CancellationQuantities =>
  isRecord(value) &&
  typeof value.quantityAvailableToCancel === 'number' &&
  typeof value.quantityOrdered === 'number';

export const isCancellationEligible = (item: OrderProductItem): boolean => {
  const omsData = item.omsData;
  return (
    hasCancellationQuantities(omsData) &&
    omsData.quantityAvailableToCancel === omsData.quantityOrdered
  );
};

export const hasOnlyCancellationEligibleItems = (
  items: readonly OrderProductItem[] | undefined,
): boolean => items !== undefined && items.length > 0 && items.every(isCancellationEligible);

const preferredReason = (codes: readonly OmsReasonCode[]): string | undefined =>
  codes.find((code) => code.default)?.reason ?? codes[0]?.reason;

const availabilityReason = (availability: OmsAvailability): string | undefined => {
  switch (availability.kind) {
    case 'active':
      return undefined;
    case 'gated':
      return availability.reason;
  }
};

const seededOrderReason = (order: SeededOmsOrderNumber): string | undefined => {
  switch (order.kind) {
    case 'configured':
      return undefined;
    case 'not-configured':
      return order.reason;
  }
};

export const composeCancellationSkipReason = (
  availability: OmsAvailability,
  order: SeededOmsOrderNumber,
): string => [availabilityReason(availability), seededOrderReason(order)].filter(Boolean).join(' ');

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
