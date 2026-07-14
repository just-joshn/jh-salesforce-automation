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

export const lineItems = (order: Order): ProductItem[] => order.productItems ?? [];
export const shipmentsOf = (order: Order): Shipment[] => order.shipments ?? [];
export const paymentInstrumentsOf = (order: Order): { paymentMethodId?: string }[] =>
  order.paymentInstruments ?? [];
export const orderTotalOf = (basket: Basket): number => basket.orderTotal ?? 0;

// The shipment a step expects on the order; fails clearly if it is missing.
export const shipmentById = (order: Order, shipmentId: string): Shipment => {
  const shipment = shipmentsOf(order).find((s) => s.shipmentId === shipmentId);
  if (!shipment) throw new Error(`order has no shipment ${shipmentId}`);
  return shipment;
};

// The shipping method id assigned to a shipment (the delivery method), if one is set.
export const shippingMethodId = (shipment: Shipment): string | undefined =>
  shipment.shippingMethod?.id;

// The order number of a placed order; fails clearly if the order didn't come back with one.
export const orderNumber = (order: Order): string => {
  if (!order.orderNo) throw new Error('response has no order number');
  return order.orderNo;
};

export interface CheckoutFixture {
  masterId: string;
  email: string;
  shipmentId: string;
  shippingMethodId: string;
  address: Address;
  card: Card;
}

// Guest checkout fixture; the email avoids example.com, which the store rejects. The spec
// resolves an in-stock variant of the master at runtime, since hardcoded variants go stale.
export const checkout: CheckoutFixture = {
  masterId: '78916783M',
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
