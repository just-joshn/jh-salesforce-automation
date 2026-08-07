import { shopperApiUrl } from '../../support/scapi';

const ORDERS = 'checkout/shopper-orders/v1';

export const order = (orderNo: string): string =>
  shopperApiUrl(ORDERS, `orders/${encodeURIComponent(orderNo)}`);

export const cancelOrder = (orderNo: string): string =>
  shopperApiUrl(ORDERS, `orders/${encodeURIComponent(orderNo)}/actions/oms-cancel-order`);
