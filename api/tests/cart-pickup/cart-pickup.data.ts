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

// inventories is only populated when stock is requested per store
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

// Stores from a search; the demo omits the array for an area with none nearby.
export const storesOf = (result: StoreSearchResult): Store[] => result.data ?? [];

// True when the store can sell the variant (its own inventory if it has one, else the default).
export const orderableInStore = (product: Product, inventoryId: string): boolean => {
  const stock =
    (product.inventories ?? []).find((entry) => entry.id === inventoryId) ?? product.inventory;
  return Boolean(stock?.orderable);
};

export const lineItems = (basket: Basket): ProductItem[] => basket.productItems ?? [];
export const shipmentsOf = (basket: Basket): Shipment[] => basket.shipments ?? [];

// The shipment a step expects on the basket; fails clearly if it is missing.
export const shipmentById = (basket: Basket, shipmentId: string): Shipment => {
  const shipment = shipmentsOf(basket).find((entry) => entry.shipmentId === shipmentId);
  if (!shipment) throw new Error(`basket has no shipment ${shipmentId}`);
  return shipment;
};

// The shipping method id assigned to a shipment (e.g. the pickup method), if one is set.
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

// Pickup fixture: a shirt master product (the spec picks an in-stock variant at runtime),
// the in-store pickup method GBP005, and areas with and without nearby stores.
export const pickup: PickupFixture = {
  masterId: '78916783M',
  quantity: 1,
  pickupMethodId: 'GBP005',
  shipmentId: 'me',
  nearby: { countryCode: 'US', postalCode: '01801', maxDistance: '100' },
  empty: { countryCode: 'US', postalCode: '99950', maxDistance: '5' },
};
