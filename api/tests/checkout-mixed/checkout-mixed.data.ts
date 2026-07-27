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

// Store list; missing array = no stores.
export const storesOf = (result: StoreSearchResult): Store[] => result.data ?? [];

// True if store can sell this size.
export const orderableInStore = (product: Product, inventoryId: string): boolean => {
  const stock =
    (product.inventories ?? []).find((entry) => entry.id === inventoryId) ?? product.inventory;
  return Boolean(stock?.orderable);
};

export const lineItems = (order: Order): ProductItem[] => order.productItems ?? [];
export const shipmentsOf = (order: Order): Shipment[] => order.shipments ?? [];
export const orderTotalOf = (basket: Basket): number => basket.orderTotal ?? 0;

// Get shipment or fail clear.
export const shipmentById = (order: Order, shipmentId: string): Shipment => {
  const shipment = shipmentsOf(order).find((s) => s.shipmentId === shipmentId);
  if (!shipment) throw new Error(`order has no shipment ${shipmentId}`);
  return shipment;
};

// Method id on a shipment.
export const shippingMethodId = (shipment: Shipment): string | undefined =>
  shipment.shippingMethod?.id;

// Order number or fail clear.
export const orderNumber = (order: Order): string => {
  if (!order.orderNo) throw new Error('response has no order number');
  return order.orderNo;
};

// Main product. Spec picks two in-stock sizes (ship + pickup).
export const checkout: MixedCheckoutFixture = {
  masterId: '25591139M',
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
