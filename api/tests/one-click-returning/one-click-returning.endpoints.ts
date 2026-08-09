import { shopperApiUrl, slasUrl } from '../../support/scapi';

export const customers = (): string => shopperApiUrl('customer/shopper-customers', 'customers');

export const customer = (customerId: string): string =>
  shopperApiUrl('customer/shopper-customers', `customers/${encodeURIComponent(customerId)}`);

export const customerAddresses = (customerId: string): string =>
  shopperApiUrl(
    'customer/shopper-customers',
    `customers/${encodeURIComponent(customerId)}/addresses`,
  );

export const customerPaymentInstruments = (customerId: string): string =>
  shopperApiUrl(
    'customer/shopper-customers',
    `customers/${encodeURIComponent(customerId)}/payment-instruments`,
  );

export const baskets = (): string => shopperApiUrl('checkout/shopper-baskets', 'baskets');

export const basketItems = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets', `baskets/${encodeURIComponent(basketId)}/items`);

export const transferBasket = (): string =>
  shopperApiUrl('checkout/shopper-baskets', 'baskets/actions/transfer');

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

export const orders = (): string => shopperApiUrl('checkout/shopper-orders', 'orders');

export const order = (orderNo: string): string =>
  shopperApiUrl('checkout/shopper-orders', `orders/${encodeURIComponent(orderNo)}`);

export const registeredLogin = (): string => slasUrl('oauth2/login');

export const token = (): string => slasUrl('oauth2/token');

export const passwordlessLogin = (): string => slasUrl('oauth2/passwordless/login');

export const passwordlessToken = (): string => slasUrl('oauth2/passwordless/token');
