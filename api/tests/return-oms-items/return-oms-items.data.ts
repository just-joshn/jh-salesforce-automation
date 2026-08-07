import type { APIRequestContext } from '@playwright/test';
import { env } from '../../../config/env';
import type {
  OmsReasonCode,
  OrderItemResource,
  OrderResource,
  ShopperCredentials,
} from '../../support/oms';
import { configuredShopper, omsPreflight, readOwnedOrder } from '../../support/oms';

export interface ReturnableLine {
  itemId: string;
  availableToReturn: number;
}

export interface ReturnItemsCondition {
  met: boolean;
  reason: string;
  orderNo: string;
  credentials: ShopperCredentials;
  accessToken: string;
  returnable: ReturnableLine[];
  reasonCodes: OmsReasonCode[];
}

const unmet = (reason: string): ReturnItemsCondition => ({
  met: false,
  reason,
  orderNo: '',
  credentials: configuredShopper(),
  accessToken: '',
  returnable: [],
  reasonCodes: [],
});

const returnableLine = (item: OrderItemResource): ReturnableLine[] => {
  const available = item.omsData?.quantityAvailableToReturn ?? 0;
  if (item.itemId === undefined) return [];
  return available > 0 ? [{ itemId: item.itemId, availableToReturn: available }] : [];
};

export const returnableFrom = (order: OrderResource): ReturnableLine[] =>
  (order.productItems ?? []).flatMap(returnableLine);

export const intendedLine = (condition: ReturnItemsCondition): ReturnableLine => {
  const [first] = condition.returnable;
  if (first === undefined) throw new Error('the met condition guaranteed a returnable line');
  return first;
};

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
  accessToken: string,
  reasonCodes: OmsReasonCode[],
): ReturnItemsCondition => {
  const returnable = returnableFrom(order);
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
    accessToken,
    returnable,
    reasonCodes,
  };
};

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
    lookup.accessToken,
    pre.activation.returnReasonCodes,
  );
};

export const defaultReason = (reasonCodes: OmsReasonCode[]): string =>
  reasonCodes.find((code) => code.default === true)?.reason ?? '';

export interface ReturnOrderLine {
  itemId: string;
  quantity: number;
  reason?: string;
}

export interface ReturnOrderBody {
  productItems: ReturnOrderLine[];
}

export const returnBody = (
  line: ReturnableLine,
  quantity: number,
  reason: string,
): ReturnOrderBody => ({
  productItems: [
    {
      itemId: line.itemId,
      quantity,
      ...(reason === '' ? {} : { reason }),
    },
  ],
});

export const faultType = async (response: {
  json(): Promise<unknown>;
}): Promise<string | undefined> => {
  const body = (await response.json()) as { type?: unknown };
  return typeof body.type === 'string' ? body.type : undefined;
};
