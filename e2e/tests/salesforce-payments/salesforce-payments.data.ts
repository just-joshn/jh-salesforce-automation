import { randomUUID } from 'node:crypto';

import type { OrderableVariant } from '../../../api/support/products';

export interface ProductSelection {
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

export interface CheckoutInput {
  readonly email: string;
  readonly shippingAddress: ShippingAddress;
}

export interface SalesforcePaymentsInput {
  readonly cardNumber: string;
  readonly expirationDate: string;
  readonly nameOnCard: string;
  readonly securityCode: string;
}

const shippingAddress: ShippingAddress = Object.freeze({
  address: '1 Market Street',
  city: 'San Francisco',
  firstName: 'CUJ',
  lastName: 'Shopper',
  phone: '4155550123',
  state: 'CA',
  zipCode: '94105',
});

const salesforcePaymentsInput: SalesforcePaymentsInput = Object.freeze({
  cardNumber: '4111111111111111',
  expirationDate: '12/30',
  nameOnCard: 'CUJ Shopper',
  securityCode: '123',
});

export const createCheckoutInput = (): CheckoutInput =>
  Object.freeze({
    email: `cuj2-${Date.now()}-${randomUUID()}@mailinator.com`,
    shippingAddress,
  });

export const selectProduct = (product: OrderableVariant): ProductSelection =>
  Object.freeze({
    productId: product.productId,
    productName: product.productName,
    variantId: product.variantId,
  });

export const isBundleOrSet = (productName: string): boolean => /\b(bundle|set)\b/i.test(productName);

export const acceptedSalesforcePaymentsInput = salesforcePaymentsInput;
