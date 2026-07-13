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
  deliveryVariantId: string;
  pickupVariantId: string;
  deliveryShipmentId: string;
  pickupShipmentId: string;
  deliveryMethodId: string;
  pickupMethodId: string;
  email: string;
  storeQuery: StoreSearchQuery;
  address: Address;
  card: Card;
}

// one shirt variant for delivery, one for pickup
export const checkout: MixedCheckoutFixture = {
  deliveryVariantId: '78916783M-1',
  pickupVariantId: '78916783M-2',
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
