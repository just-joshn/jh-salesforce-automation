import { env } from '../../../config/env';
import { shopperApiUrl } from '../../support/scapi';

const BASKETS = 'checkout/shopper-baskets/v2';
const CONFIGURATIONS = 'configuration/shopper-configurations/v1';
const ORDERS = 'checkout/shopper-orders/v1';

export const configurations = (): string => shopperApiUrl(CONFIGURATIONS, 'configurations');

export const configuredAsset = (url: string): string => new URL(url, env.baseURL).toString();

export const baskets = (): string => shopperApiUrl(BASKETS, 'baskets');

export const basket = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}`);

export const basketItems = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/items`);

export const basketCustomer = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/customer`);

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

export const billingAddress = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/billing-address`);

export const paymentInstruments = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/payment-instruments`);

export const orders = (): string => shopperApiUrl(ORDERS, 'orders');
