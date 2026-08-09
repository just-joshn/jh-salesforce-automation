import { shopperApiUrl, slasUrl } from '../../support/scapi';

export const otpRequest = (): string => slasUrl('oauth2/otp/request');

export const otpVerification = (): string => slasUrl('oauth2/otp/verify');

export const customers = (): string => shopperApiUrl('customer/shopper-customers', 'customers');

export const baskets = (): string => shopperApiUrl('checkout/shopper-baskets', 'baskets');

export const basketItems = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets', `baskets/${encodeURIComponent(basketId)}/items`);

export const basketCustomer = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets', `baskets/${encodeURIComponent(basketId)}/customer`);

export const basketPaymentInstruments = (basketId: string): string =>
  shopperApiUrl(
    'checkout/shopper-baskets',
    `baskets/${encodeURIComponent(basketId)}/payment-instruments`,
  );

export const customerPaymentInstruments = (customerId: string): string =>
  shopperApiUrl(
    'customer/shopper-customers',
    `customers/${encodeURIComponent(customerId)}/payment-instruments`,
  );

export const shipmentAddress = (basketId: string, shipmentId: string): string =>
  shopperApiUrl(
    'checkout/shopper-baskets',
    `baskets/${encodeURIComponent(basketId)}/shipments/${encodeURIComponent(shipmentId)}/shipping-address`,
  );

export const shipmentMethod = (basketId: string, shipmentId: string): string =>
  shopperApiUrl(
    'checkout/shopper-baskets',
    `baskets/${encodeURIComponent(basketId)}/shipments/${encodeURIComponent(shipmentId)}/shipping-method`,
  );

export const shipmentMethods = (basketId: string, shipmentId: string): string =>
  shopperApiUrl(
    'checkout/shopper-baskets',
    `baskets/${encodeURIComponent(basketId)}/shipments/${encodeURIComponent(shipmentId)}/shipping-methods`,
  );

export const orders = (): string => shopperApiUrl('checkout/shopper-orders', 'orders');

export const order = (orderNo: string): string =>
  shopperApiUrl('checkout/shopper-orders', `orders/${encodeURIComponent(orderNo)}`);
