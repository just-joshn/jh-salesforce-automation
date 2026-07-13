import { shopperApiUrl } from '../../support/scapi';

const BASKETS = 'checkout/shopper-baskets/v1';
const ORDERS = 'checkout/shopper-orders/v1';
const PRODUCTS = 'product/shopper-products/v1';

export const product = (productId: string): string =>
  shopperApiUrl(PRODUCTS, `products/${encodeURIComponent(productId)}`);
export const baskets = (): string => shopperApiUrl(BASKETS, 'baskets');
export const basket = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}`);
export const basketItems = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/items`);
export const customer = (basketId: string): string =>
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
export const order = (orderNo: string): string =>
  shopperApiUrl(ORDERS, `orders/${encodeURIComponent(orderNo)}`);
