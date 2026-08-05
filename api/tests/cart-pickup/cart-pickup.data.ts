import type { APIRequestContext } from '@playwright/test';
import type { OrderableVariant } from '../../support/products';
import { findOrderableVariants } from '../../support/products';

export interface StoreSearchQuery {
  countryCode: string;
  postalCode: string;
  maxDistance: string;
}

export interface Store {
  id: string;
  name?: string;
  city?: string;
  inventoryId: string;
}

export interface StoreSearchResult {
  total: number;
  data?: Store[];
}

export interface Inventory {
  id: string;
  orderable?: boolean;
  ats?: number;
}

// inventories only if we asked per store.
export interface Product {
  id: string;
  inventory?: Inventory;
  inventories?: Inventory[];
}

export interface Shipment {
  shipmentId: string;
  shippingMethod?: { id: string };
  c_fromStoreId?: string;
}

export interface ProductItem {
  productId: string;
  quantity: number;
  shipmentId?: string;
  inventoryId?: string;
}

export interface Basket {
  basketId: string;
  productItems?: ProductItem[];
  shipments?: Shipment[];
}

// Store list; missing array = no stores.
export const storesOf = (result: StoreSearchResult): Store[] => result.data ?? [];

// True if store can sell this size.
export const orderableInStore = (product: Product, inventoryId: string): boolean => {
  const stock =
    (product.inventories ?? []).find((entry) => entry.id === inventoryId) ?? product.inventory;
  return Boolean(stock?.orderable);
};

export const lineItems = (basket: Basket): ProductItem[] => basket.productItems ?? [];
export const shipmentsOf = (basket: Basket): Shipment[] => basket.shipments ?? [];

// Get cart shipment or fail clear.
export const shipmentById = (basket: Basket, shipmentId: string): Shipment => {
  const shipment = shipmentsOf(basket).find((entry) => entry.shipmentId === shipmentId);
  if (!shipment) throw new Error(`basket has no shipment ${shipmentId}`);
  return shipment;
};

// Method id on a shipment (e.g. pickup).
export const shippingMethodId = (shipment: Shipment): string | undefined =>
  shipment.shippingMethod?.id;

export interface PickupFixture {
  masterId: string;
  quantity: number;
  pickupMethodId: string;
  shipmentId: string;
  nearby: StoreSearchQuery;
  empty: StoreSearchQuery;
}

// Pickup data: product, pickup method, areas with/without stores.
export const pickup: PickupFixture = {
  masterId: '25591139M',
  quantity: 1,
  pickupMethodId: 'GBP005',
  shipmentId: 'me',
  nearby: { countryCode: 'US', postalCode: '01801', maxDistance: '100' },
  empty: { countryCode: 'US', postalCode: '99950', maxDistance: '5' },
};

// Sizes that are in stock right now; the demo store's stock keeps moving.
export const orderableVariants = (
  request: APIRequestContext,
  accessToken: string,
): Promise<OrderableVariant[]> =>
  findOrderableVariants(request, accessToken, { masterId: pickup.masterId, minCount: 1 });
