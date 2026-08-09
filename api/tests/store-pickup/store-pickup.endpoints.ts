import { shopperApiUrl } from '../../support/scapi';

export const baskets = (): string => shopperApiUrl('checkout/shopper-baskets', 'baskets');

export const basketItems = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets', `baskets/${encodeURIComponent(basketId)}/items`);

export const basketCustomer = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets', `baskets/${encodeURIComponent(basketId)}/customer`);

export const basketBillingAddress = (basketId: string): string =>
  shopperApiUrl(
    'checkout/shopper-baskets',
    `baskets/${encodeURIComponent(basketId)}/billing-address`,
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

export const basketPaymentInstruments = (basketId: string): string =>
  shopperApiUrl(
    'checkout/shopper-baskets',
    `baskets/${encodeURIComponent(basketId)}/payment-instruments`,
  );

export const product = (productId: string): string =>
  shopperApiUrl('product/shopper-products', `products/${encodeURIComponent(productId)}`);

export const productSearch = (): string => shopperApiUrl('search/shopper-search', 'product-search');

export const orders = (): string => shopperApiUrl('checkout/shopper-orders', 'orders');
