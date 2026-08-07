import { shopperApiUrl } from '../../support/scapi';

const ORDERS = 'checkout/shopper-orders/v1';

export const order = (orderNo: string): string =>
  shopperApiUrl(ORDERS, `orders/${encodeURIComponent(orderNo)}`);

export const returnOrder = (orderNo: string): string =>
  shopperApiUrl(ORDERS, `orders/${encodeURIComponent(orderNo)}/actions/oms-return-order`);
