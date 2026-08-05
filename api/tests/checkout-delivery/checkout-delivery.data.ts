import type { APIRequestContext } from '@playwright/test';
import type { OrderableVariant } from '../../support/products';
import { findOrderableVariants } from '../../support/products';
import type {
  Basket,
  Order,
  OrderPaymentInstrument,
  OrderProductItem,
  OrderShipment,
} from '../../support/scapi-types';

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

// Fake card the demo store accepts.
export interface Card {
  cardType: string;
  expirationMonth: number;
  expirationYear: number;
  holder: string;
  securityCode: string;
}

export const lineItems = (order: Order): OrderProductItem[] => order.productItems ?? [];
export const shipmentsOf = (order: Order): OrderShipment[] => order.shipments ?? [];
export const paymentInstrumentsOf = (order: Order): OrderPaymentInstrument[] =>
  order.paymentInstruments ?? [];
export const orderTotalOf = (basket: Basket): number => basket.orderTotal ?? 0;

// Get shipment or fail clear.
export const shipmentById = (order: Order, shipmentId: string): OrderShipment => {
  const shipment = shipmentsOf(order).find((s) => s.shipmentId === shipmentId);
  if (!shipment) throw new Error(`order has no shipment ${shipmentId}`);
  return shipment;
};

// Shipping method id on a shipment.
export const shippingMethodId = (shipment: OrderShipment): string | undefined =>
  shipment.shippingMethod?.id;

// Order number or fail clear.
export const orderNumber = (order: Order): string => {
  if (!order.orderNo) throw new Error('response has no order number');
  return order.orderNo;
};

export interface CheckoutFixture {
  masterId: string;
  email: string;
  quantity: number;
  shipmentId: string;
  shippingMethodId: string;
  address: Address;
  card: Card;
}

// Guest checkout data. No example.com emails (store rejects them).
export const checkout: CheckoutFixture = {
  masterId: '25591139M',
  email: 'test.shopper@gmail.com',
  quantity: 1,
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

// The only payment method the demo store takes.
export const paymentMethodId = 'CREDIT_CARD';

// A freshly placed order reports `new` here; a site that holds orders before
// processing them reports `created`. Typed against the spec's own status union,
// so dropping either value upstream fails the build rather than a run.
export const placedStatuses: Order['status'][] = ['new', 'created'];

// A size that is in stock right now; the demo store's stock keeps moving.
export const orderableVariant = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<OrderableVariant> => {
  const [variant] = await findOrderableVariants(request, accessToken, {
    masterId: checkout.masterId,
    minCount: 1,
  });
  if (!variant) throw new Error('expected an orderable variant');
  return variant;
};
