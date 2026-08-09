import { shopperApiUrl } from '../../support/scapi';

export const customers = (): string => shopperApiUrl('customer/shopper-customers', 'customers');

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
