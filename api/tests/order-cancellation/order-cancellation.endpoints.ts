import { shopperApiUrl } from '../../support/scapi';

const ordersApi = 'checkout/shopper-orders';

export const omsMetadata = (): string => shopperApiUrl(ordersApi, 'orders/oms-meta-data');

export const cancelOrder = (orderNo: string): string =>
  shopperApiUrl(ordersApi, `orders/${encodeURIComponent(orderNo)}/actions/oms-cancel-order`);
