import type { OmsAvailability, SeededOmsOrderNumber } from '../../support/oms';
import { required } from '../../support/scapi';
import type { OmsMetaData, OmsReasonCode, Order, OrderProductItem } from '../../support/scapi-types';

interface ReturnQuantities {
  readonly quantityAvailableToReturn: number;
}

interface ReturnEligibleItem extends OrderProductItem {
  readonly omsData: ReturnQuantities;
}

type DataRecord = Readonly<Record<string, unknown>>;

export interface ReturnRequest {
  readonly productItems: readonly [{ readonly itemId: string; readonly quantity: number; readonly reason: string }];
}

export interface ReturnSelection {
  readonly itemId: string;
  readonly quantity: number;
  readonly reason: string;
}

export type ReturnJourneyGate =
  | { readonly kind: 'ready'; readonly metadata: OmsMetaData; readonly orderNo: string }
  | { readonly kind: 'skip'; readonly reason: string };

const isRecord = (value: unknown): value is DataRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasReturnQuantity = (value: unknown): value is ReturnQuantities =>
  isRecord(value) &&
  typeof value.quantityAvailableToReturn === 'number' &&
  value.quantityAvailableToReturn > 0;

export const isReturnEligible = (item: OrderProductItem): item is ReturnEligibleItem =>
  hasReturnQuantity(item.omsData);

const returnableItem = (order: Order): ReturnEligibleItem => {
  const item = order.productItems?.find(isReturnEligible);
  if (!item) {
    throw new Error('OMS-expanded order contains no return-eligible product item');
  }

  return item;
};

const selectedReason = (codes: readonly OmsReasonCode[]): string => {
  const reason = codes.find((code) => code.default)?.reason ?? codes[0]?.reason;
  if (!reason) {
    throw new Error('OMS metadata contains no return reason codes');
  }

  return reason;
};

export const returnSelection = (order: Order, metadata: OmsMetaData): ReturnSelection => {
  const item = returnableItem(order);
  return {
    itemId: required(item.itemId, 'order.productItems[].itemId'),
    quantity: required(
      item.omsData.quantityAvailableToReturn,
      'order.productItems[].omsData.quantityAvailableToReturn',
    ),
    reason: selectedReason(metadata.returnReasonCodes),
  };
};

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

export const composeReturnSkipReason = (
  availability: OmsAvailability,
  order: SeededOmsOrderNumber,
): string => [availabilityReason(availability), seededOrderReason(order)].filter(Boolean).join(' ');

export const returnJourneyGate = (
  availability: OmsAvailability,
  order: SeededOmsOrderNumber,
): ReturnJourneyGate => {
  if (availability.kind === 'active' && order.kind === 'configured') {
    return { kind: 'ready', metadata: availability.metadata, orderNo: order.orderNo };
  }

  return { kind: 'skip', reason: composeReturnSkipReason(availability, order) };
};

export const returnRequest = (selection: ReturnSelection): ReturnRequest => ({
  productItems: [selection],
});
