export interface StoreSearchQuery {
  countryCode: string;
  postalCode: string;
  maxDistance: string;
}

export interface Store {
  id: string;
  inventoryId: string;
}

export interface StoreSearchResult {
  total: number;
  data?: Store[];
}

export interface Inventory {
  id: string;
  orderable?: boolean;
}

export interface Product {
  id: string;
  inventory?: Inventory;
  inventories?: Inventory[];
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

export interface ProductItem {
  productId: string;
  shipmentId?: string;
}

export interface Shipment {
  shipmentId: string;
  shippingMethod?: { id: string };
  c_fromStoreId?: string;
}

export interface Order {
  orderNo?: string;
  status?: string;
  productItems?: ProductItem[];
  shipments?: Shipment[];
}

export interface Basket {
  basketId: string;
  orderTotal?: number;
}

export interface MixedCheckoutFixture {
  masterId: string;
  deliveryShipmentId: string;
  pickupShipmentId: string;
  deliveryMethodId: string;
  pickupMethodId: string;
  email: string;
  storeQuery: StoreSearchQuery;
  address: Address;
  card: Card;
}

// Stores from a search; the demo omits the array for an area with none nearby.
export const storesOf = (result: StoreSearchResult): Store[] => result.data ?? [];

// True when the store can sell the variant (its own inventory if it has one, else the default).
export const orderableInStore = (product: Product, inventoryId: string): boolean => {
  const stock =
    (product.inventories ?? []).find((entry) => entry.id === inventoryId) ?? product.inventory;
  return Boolean(stock?.orderable);
};

export const lineItems = (order: Order): ProductItem[] => order.productItems ?? [];
export const shipmentsOf = (order: Order): Shipment[] => order.shipments ?? [];
export const orderTotalOf = (basket: Basket): number => basket.orderTotal ?? 0;

// The shipment a step expects on the order; fails clearly if it is missing.
export const shipmentById = (order: Order, shipmentId: string): Shipment => {
  const shipment = shipmentsOf(order).find((s) => s.shipmentId === shipmentId);
  if (!shipment) throw new Error(`order has no shipment ${shipmentId}`);
  return shipment;
};

// The shipping method id assigned to a shipment (delivery or pickup method), if one is set.
export const shippingMethodId = (shipment: Shipment): string | undefined =>
  shipment.shippingMethod?.id;

// The order number of a placed order; fails clearly if the order didn't come back with one.
export const orderNumber = (order: Order): string => {
  if (!order.orderNo) throw new Error('response has no order number');
  return order.orderNo;
};

// One shirt master product; the spec picks two in-stock variants of it at runtime (one for
// delivery, one for pickup), since hardcoded variants go stale as stock sells out.
export const checkout: MixedCheckoutFixture = {
  masterId: '78916783M',
  deliveryShipmentId: 'me',
  pickupShipmentId: 'pickup',
  deliveryMethodId: 'GBP001',
  pickupMethodId: 'GBP005',
  email: 'test.shopper@gmail.com',
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
