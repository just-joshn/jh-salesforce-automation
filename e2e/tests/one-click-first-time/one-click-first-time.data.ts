import { randomUUID } from 'node:crypto';

import type { OrderableVariant } from '../../../api/support/products';

export interface FirstTimeShopper {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly password: string;
}

export interface JourneyProduct {
  readonly productId: string;
  readonly productName: string;
  readonly variantId: string;
}

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

export const otpMailboxSkipReason =
  'OTP entry is unprovable: this suite cannot read the external mailbox that receives the one-time code.';

export const shippingAddress: ShippingAddress = Object.freeze({
  address: '1 Market Street',
  city: 'San Francisco',
  firstName: 'CUJ',
  lastName: 'FirstTime',
  phone: '4155550123',
  state: 'CA',
  zipCode: '94105',
});

export const paymentCard: PaymentCard = Object.freeze({
  expirationDate: '12/30',
  nameOnCard: 'CUJ First-Time Shopper',
  number: '4111111111111111',
  securityCode: '123',
});

export const createFirstTimeShopper = (): FirstTimeShopper =>
  Object.freeze({
    email: `cuj5-${randomUUID().replaceAll('-', '')}@mailinator.com`,
    firstName: 'CUJ',
    lastName: 'FirstTime',
    password: 'Passw0rd!2026',
  });

export const toJourneyProduct = (variant: OrderableVariant): JourneyProduct => ({
  productId: variant.productId,
  productName: variant.productName,
  variantId: variant.variantId,
});
