import { shopperApiUrl } from '../../support/scapi';

export const baskets = (): string => shopperApiUrl('checkout/shopper-baskets', 'baskets');

export const basketItems = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets', `baskets/${encodeURIComponent(basketId)}/items`);

export const basketCustomer = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets', `baskets/${encodeURIComponent(basketId)}/customer`);

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

export const basketPaymentInstruments = (basketId: string): string =>
  shopperApiUrl(
    'checkout/shopper-baskets',
    `baskets/${encodeURIComponent(basketId)}/payment-instruments`,
  );

export const basketPaymentMethods = (basketId: string): string =>
  shopperApiUrl(
    'checkout/shopper-baskets',
    `baskets/${encodeURIComponent(basketId)}/payment-methods`,
  );

export const orders = (): string => shopperApiUrl('checkout/shopper-orders', 'orders');

export const order = (orderNo: string): string =>
  shopperApiUrl('checkout/shopper-orders', `orders/${encodeURIComponent(orderNo)}`);

export const orderPaymentInstrument = (
  orderNo: string,
  paymentInstrumentId: string,
): string =>
  shopperApiUrl(
    'checkout/shopper-orders',
    `orders/${encodeURIComponent(orderNo)}/payment-instruments/${encodeURIComponent(paymentInstrumentId)}`,
  );

export const shopperConfigurations = (): string =>
  shopperApiUrl('configuration/shopper-configurations', 'configurations');
