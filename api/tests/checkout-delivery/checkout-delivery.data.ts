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

// the test store won't accept a real card number, so this is a safe stand-in
export interface Card {
  cardType: string;
  expirationMonth: number;
  expirationYear: number;
  holder: string;
  securityCode: string;
}

export interface ProductItem {
  productId: string;
  quantity: number;
  shipmentId?: string;
  price?: number;
}

export interface Shipment {
  shipmentId: string;
  shippingMethod?: { id: string };
}

export interface Order {
  orderNo?: string;
  status?: string;
  productItems?: ProductItem[];
  shipments?: Shipment[];
  paymentInstruments?: { paymentMethodId?: string }[];
  orderTotal?: number;
}

export interface Basket {
  basketId: string;
  orderTotal?: number;
  productItems?: ProductItem[];
}

export interface CheckoutFixture {
  variantId: string;
  email: string;
  shipmentId: string;
  shippingMethodId: string;
  address: Address;
  card: Card;
}

// guest checkout fixture; the email avoids example.com, which the store rejects
export const checkout: CheckoutFixture = {
  variantId: '78916783M-1',
  email: 'test.shopper@gmail.com',
  shipmentId: 'me',
  shippingMethodId: 'GBP001',
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
