import { shopperApiUrl } from '../../support/scapi';

// Find stores + their stock ids.
export const storeSearch = (): string => shopperApiUrl('store/shopper-stores/v1', 'store-search');

// Get stock per store for a product.
export const product = (productId: string): string =>
  shopperApiUrl('product/shopper-products/v1', `products/${encodeURIComponent(productId)}`);

export const baskets = (): string => shopperApiUrl('checkout/shopper-baskets/v1', 'baskets');

export const basket = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets/v1', `baskets/${encodeURIComponent(basketId)}`);

export const basketItems = (basketId: string): string =>
  shopperApiUrl('checkout/shopper-baskets/v1', `baskets/${encodeURIComponent(basketId)}/items`);

export const shipment = (basketId: string, shipmentId: string): string =>
  shopperApiUrl(
    'checkout/shopper-baskets/v1',
    `baskets/${encodeURIComponent(basketId)}/shipments/${encodeURIComponent(shipmentId)}`,
  );
