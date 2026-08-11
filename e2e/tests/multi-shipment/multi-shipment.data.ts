import { randomUUID } from 'node:crypto';

import type { OrderableVariant } from '../../../api/support/products';

export type JourneyProduct = OrderableVariant;

export interface ShippingAddress {
  readonly address: string;
  readonly city: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
  readonly state: string;
  readonly zipCode: string;
}

export interface PaymentCard {
  readonly expirationDate: string;
  readonly nameOnCard: string;
  readonly number: string;
  readonly securityCode: string;
}

export interface MultiShipmentCheckoutInput {
  readonly addresses: readonly [ShippingAddress, ShippingAddress];
  readonly email: string;
  readonly payment: PaymentCard;
}

export const defaultShippingMethod = 'Ground';

export const defaultShippingMethods = [defaultShippingMethod, defaultShippingMethod] as const;

export const revalidationMethod = '2-Day Express';

export const destinationAddresses: readonly [ShippingAddress, ShippingAddress] = Object.freeze([
  Object.freeze({
    address: '1 Market Street',
    city: 'San Francisco',
    firstName: 'Avery',
    lastName: 'North',
    phone: '4155550101',
    state: 'CA',
    zipCode: '94105',
  }),
  Object.freeze({
    address: '350 Fifth Avenue',
    city: 'New York',
    firstName: 'Blake',
    lastName: 'East',
    phone: '2125550102',
    state: 'NY',
    zipCode: '10001',
  }),
]);

const acceptedTestCard: PaymentCard = Object.freeze({
  expirationDate: '12/30',
  nameOnCard: 'CUJ Shopper',
  number: '4111111111111111',
  securityCode: '123',
});

export const createCheckoutInput = (): MultiShipmentCheckoutInput =>
  Object.freeze({
    addresses: destinationAddresses,
    email: `cuj7-${Date.now()}-${randomUUID()}@mailinator.com`,
    payment: acceptedTestCard,
  });

export const addressLabel = (address: ShippingAddress): string =>
  `${address.firstName} ${address.lastName} - ${address.address}, ${address.city}, ${address.state} ${address.zipCode}`;

export const recipientName = (address: ShippingAddress): string =>
  `${address.firstName} ${address.lastName}`;
