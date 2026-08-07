import { shopperApiUrl } from '../../support/scapi';

const BASKETS = 'checkout/shopper-baskets/v1';
const ORDERS = 'checkout/shopper-orders/v1';
const CUSTOMERS = 'customer/shopper-customers/v1';
const PRODUCTS = 'product/shopper-products/v1';
const STORES = 'store/shopper-stores/v1';

export const customers = (): string => shopperApiUrl(CUSTOMERS, 'customers');
export const customerOrders = (customerId: string): string =>
  shopperApiUrl(CUSTOMERS, `customers/${encodeURIComponent(customerId)}/orders`);
export const baskets = (): string => shopperApiUrl(BASKETS, 'baskets');
export const basket = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}`);
export const basketItems = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/items`);
export const basketCustomer = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/customer`);
export const shipmentAddress = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/shipments/me/shipping-address`);
export const shippingMethod = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/shipments/me/shipping-method`);
export const shipment = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/shipments/me`);
export const billingAddress = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/billing-address`);
export const paymentInstruments = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/payment-instruments`);
export const orders = (): string => shopperApiUrl(ORDERS, 'orders');
export const order = (orderNo: string): string =>
  shopperApiUrl(ORDERS, `orders/${encodeURIComponent(orderNo)}`);
export const products = (): string => shopperApiUrl(PRODUCTS, 'products');
export const stores = (): string => shopperApiUrl(STORES, 'stores');
