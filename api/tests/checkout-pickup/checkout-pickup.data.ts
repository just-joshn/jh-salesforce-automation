import type { APIRequestContext } from '@playwright/test';
import type { OrderableVariant } from '../../support/products';
import { findOrderableVariants } from '../../support/products';
import type {
  Basket,
  Order,
  OrderProductItem,
  OrderShipment,
  Product,
  ProductInventory,
  Store,
  StoreResult,
} from '../../support/scapi-types';

export interface StoreSearchQuery {
  countryCode: string;
  postalCode: string;
  maxDistance: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  city: string;
  stateCode: string;
  postalCode: string;
  countryCode: string;
}

export interface Card {
  cardType: string;
  expirationMonth: number;
  expirationYear: number;
  holder: string;
  securityCode: string;
}

// Store list; missing array = no stores.
export const storesOf = (result: StoreResult): Store[] => result.data ?? [];

// True if store can sell this size.
export const orderableInStore = (product: Product, inventoryId: string): boolean => {
  const stock: ProductInventory | undefined =
    (product.inventories ?? []).find((entry) => entry.id === inventoryId) ?? product.inventory;
  return Boolean(stock?.orderable);
};

export const lineItems = (order: Order): OrderProductItem[] => order.productItems ?? [];
export const shipmentsOf = (order: Order): OrderShipment[] => order.shipments ?? [];
export const orderTotalOf = (basket: Basket): number => basket.orderTotal ?? 0;

// Get shipment or fail clear.
export const shipmentById = (order: Order, shipmentId: string): OrderShipment => {
  const shipment = shipmentsOf(order).find((s) => s.shipmentId === shipmentId);
  if (!shipment) throw new Error(`order has no shipment ${shipmentId}`);
  return shipment;
};

// Method id on a shipment (e.g. pickup).
export const shippingMethodId = (shipment: OrderShipment): string | undefined =>
  shipment.shippingMethod?.id;

// Order number or fail clear.
export const orderNumber = (order: Order): string => {
  if (!order.orderNo) throw new Error('response has no order number');
  return order.orderNo;
};

export interface PickupCheckoutFixture {
  masterId: string;
  email: string;
  quantity: number;
  shipmentId: string;
  pickupMethodId: string;
  storeQuery: StoreSearchQuery;
  address: Address;
  card: Card;
}

// The in-stock size is resolved at run time.
export const checkout: PickupCheckoutFixture = {
  masterId: '25591139M',
  email: 'test.shopper@gmail.com',
  quantity: 1,
  shipmentId: 'me',
  pickupMethodId: 'GBP005',
  storeQuery: { countryCode: 'US', postalCode: '01801', maxDistance: '100' },
  address: {
    firstName: 'Test',
    lastName: 'Shopper',
    phone: '4155551234',
    address1: '415 Mission St',
    city: 'San Francisco',
    stateCode: 'CA',
    postalCode: '94105',
    countryCode: 'US',
  },
  card: {
    cardType: 'Visa',
    expirationMonth: 12,
    expirationYear: 2030,
    holder: 'Test Shopper',
    securityCode: '123',
  },
};

// The only payment method the demo store takes.
export const paymentMethodId = 'CREDIT_CARD';

// Sizes that are in stock right now; the demo store's stock keeps moving.
export const orderableVariants = (
  request: APIRequestContext,
  accessToken: string,
): Promise<OrderableVariant[]> =>
  findOrderableVariants(request, accessToken, { masterId: checkout.masterId, minCount: 1 });
