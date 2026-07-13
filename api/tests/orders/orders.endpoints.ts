import { shopperApiUrl } from '../../support/scapi';

const BASKETS = 'checkout/shopper-baskets/v1';
const ORDERS = 'checkout/shopper-orders/v1';
const CUSTOMERS = 'customer/shopper-customers/v1';

// account creation and that shopper's order history
export const customers = (): string => shopperApiUrl(CUSTOMERS, 'customers');
export const customerOrders = (customerId: string): string =>
  shopperApiUrl(CUSTOMERS, `customers/${encodeURIComponent(customerId)}/orders`);

// endpoints the placeOrder helper walks through to seed one order
export const baskets = (): string => shopperApiUrl(BASKETS, 'baskets');
export const basket = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}`);
export const basketItems = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/items`);
export const basketCustomer = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/customer`);
export const shippingAddress = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/shipments/me/shipping-address`);
export const shippingMethod = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/shipments/me/shipping-method`);
export const billingAddress = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/billing-address`);
export const paymentInstruments = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/payment-instruments`);
export const orders = (): string => shopperApiUrl(ORDERS, 'orders');
export const order = (orderNo: string): string =>
  shopperApiUrl(ORDERS, `orders/${encodeURIComponent(orderNo)}`);
