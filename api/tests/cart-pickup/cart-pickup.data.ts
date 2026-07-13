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

export interface PickupFixture {
  variantId: string;
  quantity: number;
  pickupMethodId: string;
  shipmentId: string;
  nearby: StoreSearchQuery;
  empty: StoreSearchQuery;
}

// pickup fixture: a shirt variant, the in-store pickup method GBP005, and areas with and without nearby stores
export const pickup: PickupFixture = {
  variantId: '78916783M-1',
  quantity: 1,
  pickupMethodId: 'GBP005',
  shipmentId: 'me',
  nearby: { countryCode: 'US', postalCode: '01801', maxDistance: '100' },
  empty: { countryCode: 'US', postalCode: '99950', maxDistance: '5' },
};
