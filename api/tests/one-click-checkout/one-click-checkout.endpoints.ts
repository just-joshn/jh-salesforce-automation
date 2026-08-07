import { shopperApiUrl } from '../../support/scapi';

const BASKETS = 'checkout/shopper-baskets/v2';
const CUSTOMERS = 'customer/shopper-customers/v1';
const ORDERS = 'checkout/shopper-orders/v1';

export const baskets = (): string => shopperApiUrl(BASKETS, 'baskets');

export const basket = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}`);

export const basketItems = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/items`);

export const shippingAddress = (basketId: string, shipmentId: string): string =>
  shopperApiUrl(
    BASKETS,
    `baskets/${encodeURIComponent(basketId)}/shipments/${encodeURIComponent(shipmentId)}/shipping-address`,
  );

export const shippingMethod = (basketId: string, shipmentId: string): string =>
  shopperApiUrl(
    BASKETS,
    `baskets/${encodeURIComponent(basketId)}/shipments/${encodeURIComponent(shipmentId)}/shipping-method`,
  );

export const basketPaymentInstruments = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/payment-instruments`);

export const customers = (): string => shopperApiUrl(CUSTOMERS, 'customers');

export const customer = (customerId: string): string =>
  shopperApiUrl(CUSTOMERS, `customers/${encodeURIComponent(customerId)}`);

export const customerAddresses = (customerId: string): string =>
  shopperApiUrl(CUSTOMERS, `customers/${encodeURIComponent(customerId)}/addresses`);

export const customerPaymentInstruments = (customerId: string): string =>
  shopperApiUrl(CUSTOMERS, `customers/${encodeURIComponent(customerId)}/payment-instruments`);

export const orders = (): string => shopperApiUrl(ORDERS, 'orders');
