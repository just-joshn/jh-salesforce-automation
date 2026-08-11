import { composeOmsSkipReason } from '../../../api/support/gates';
import type { OmsAvailability, SeededOmsOrderNumber } from '../../../api/support/oms';
import type {
  OmsMetaData,
  OmsReasonCode,
  OrderProductItem,
} from '../../../api/support/scapi-types';
import { env } from '../../../config/env';

export interface CancellationCredentials {
  readonly email: string;
  readonly password: string;
}

interface CancellationQuantities {
  readonly quantityAvailableToCancel: number;
  readonly quantityOrdered: number;
}

type DataRecord = Readonly<Record<string, unknown>>;

export const omsNotActiveFaultSuffix = '/oms-not-active';

export const cancellationCredentials: CancellationCredentials | undefined =
  env.E2E_ACCOUNT_EMAIL && env.E2E_ACCOUNT_PASSWORD
    ? { email: env.E2E_ACCOUNT_EMAIL, password: env.E2E_ACCOUNT_PASSWORD }
    : undefined;

const isDataRecord = (value: unknown): value is DataRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasNumberAt = (value: DataRecord, key: string): boolean => typeof value[key] === 'number';

const hasCancellationQuantities = (value: unknown): value is CancellationQuantities =>
  isDataRecord(value) &&
  hasNumberAt(value, 'quantityAvailableToCancel') &&
  hasNumberAt(value, 'quantityOrdered');

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

export const orderCancellationSkipReason = (
  availability: OmsAvailability,
  seededOrder: SeededOmsOrderNumber,
): string | undefined => {
  const reason = composeOmsSkipReason(availability, seededOrder);
  return reason.length === 0 ? undefined : reason;
};

export const requireActiveOmsMetadata = (availability: OmsAvailability): OmsMetaData => {
  switch (availability.kind) {
    case 'active':
      return availability.metadata;
    case 'gated':
      throw new Error(availability.reason);
  }
};

export const requireSeededOrderNumber = (seededOrder: SeededOmsOrderNumber): string => {
  switch (seededOrder.kind) {
    case 'configured':
      return seededOrder.orderNo;
    case 'not-configured':
      throw new Error(seededOrder.reason);
  }
};

export const requireCancellationCredentials = (): CancellationCredentials => {
  if (!cancellationCredentials) {
    throw new Error('Order cancellation requires E2E_ACCOUNT_EMAIL and E2E_ACCOUNT_PASSWORD.');
  }
  return cancellationCredentials;
};

export const preferredCancellationReason = (
  reasonCodes: readonly OmsReasonCode[],
): string | undefined =>
  reasonCodes.find((reason) => reason.default)?.reason ?? reasonCodes[0]?.reason;
