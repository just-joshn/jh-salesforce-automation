import type { OmsAvailability, SeededOmsOrderNumber } from '../../../api/support/oms';
import type { OmsMetaData, OmsReasonCode, Order } from '../../../api/support/scapi-types';

type OmsOrderProductItem = NonNullable<Order['productItems']>[number];

export interface ReturnableOrderItem extends OmsOrderProductItem {
  readonly productName: string;
  readonly omsData: {
    readonly quantityAvailableToReturn: number;
  };
}

export interface ReturnSelection {
  readonly itemName: string;
  readonly returnableQuantity: number;
  readonly reason: string;
}

export type ReturnJourneyGate =
  | { readonly kind: 'ready'; readonly metadata: OmsMetaData; readonly orderNo: string }
  | { readonly kind: 'skip'; readonly reason: string };

export const returnUiText = {
  returnModal: 'Return items',
  startReturn: 'Return',
  quantity: 'Quantity',
  reason: 'Return reason',
  reviewReturn: 'Review return',
  submitReturn: 'Submit return',
  returnSubmitted: 'Return submitted',
  returnRecorded: 'Return recorded',
} as const;

export const returnCoverageGapDescription =
  'ReturnQuantityExceeded, InvalidReasonCode, UnknownProductItemIds, and an order-specific 409 state conflict remain uncovered: SCAPI mocking is prohibited because it is the system under test, and the observed oms-not-active 409 is not evidence of an order-specific conflict.';

const isReturnableQuantity = (quantity: number | undefined): quantity is number =>
  typeof quantity === 'number' && quantity > 0;

export const isReturnableOrderItem = (item: OmsOrderProductItem): item is ReturnableOrderItem =>
  typeof item.productName === 'string' &&
  isReturnableQuantity(item.omsData?.quantityAvailableToReturn);

const returnableOrderItem = (order: Order): ReturnableOrderItem => {
  for (const item of order.productItems ?? []) {
    if (isReturnableOrderItem(item)) {
      return item;
    }
  }

  throw new Error('OMS-expanded order contains no returnable product item');
};

const preferredReturnReason = (reasonCodes: readonly OmsReasonCode[]): OmsReasonCode => {
  for (const reasonCode of reasonCodes) {
    if (reasonCode.default) {
      return reasonCode;
    }
  }

  const [firstReasonCode] = reasonCodes;
  if (!firstReasonCode) {
    throw new Error('OMS metadata contains no return reason codes');
  }

  return firstReasonCode;
};

export const returnSelection = (order: Order, metadata: OmsMetaData): ReturnSelection => {
  const item = returnableOrderItem(order);
  const reason = preferredReturnReason(metadata.returnReasonCodes);
  return {
    itemName: item.productName,
    returnableQuantity: item.omsData.quantityAvailableToReturn,
    reason: reason.reason,
  };
};

export const quantityText = (quantity: number): string => quantity.toString();

export const quantityAboveReturnable = (quantity: number): number => quantity + 1;

const omsReason = (availability: OmsAvailability): string | undefined =>
  availability.kind === 'gated' ? availability.reason : undefined;

const seededOrderReason = (order: SeededOmsOrderNumber): string | undefined =>
  order.kind === 'not-configured' ? order.reason : undefined;

// Both strings originate in OMS helpers; this only joins unmet-condition explanations.
export const composeReturnSkipReason = (
  availability: OmsAvailability,
  order: SeededOmsOrderNumber,
): string => [omsReason(availability), seededOrderReason(order)].filter(Boolean).join(' ');

export const returnJourneyGate = (
  availability: OmsAvailability,
  order: SeededOmsOrderNumber,
): ReturnJourneyGate => {
  if (availability.kind === 'active' && order.kind === 'configured') {
    return { kind: 'ready', metadata: availability.metadata, orderNo: order.orderNo };
  }

  return { kind: 'skip', reason: composeReturnSkipReason(availability, order) };
};
