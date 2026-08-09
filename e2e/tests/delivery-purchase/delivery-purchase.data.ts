import { randomUUID } from 'node:crypto';

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

export interface CheckoutInput {
  readonly email: string;
  readonly payment: PaymentCard;
  readonly shippingAddress: ShippingAddress;
}

export interface ConfirmationExpectation {
  readonly orderNumberPattern: RegExp;
  readonly pathPattern: RegExp;
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

const acceptedTestCard: PaymentCard = Object.freeze({
  expirationDate: '12/30',
  nameOnCard: 'CUJ Shopper',
  number: '4111111111111111',
  securityCode: '123',
});

export const invalidPaymentCard: PaymentCard = Object.freeze({
  expirationDate: '01/20',
  nameOnCard: 'CUJ Shopper',
  number: '123',
  securityCode: '12',
});

export const confirmationExpectation: ConfirmationExpectation = Object.freeze({
  orderNumberPattern: /^Order Number: \d{8}$/,
  pathPattern: /\/checkout\/confirmation\/\d{8}$/,
});

export const createCheckoutInput = (): CheckoutInput =>
  Object.freeze({
    email: `cuj1-${Date.now()}-${randomUUID()}@mailinator.com`,
    payment: acceptedTestCard,
    shippingAddress,
  });

export const extractOrderNumber = (confirmationText: string): string =>
  confirmationText.replace('Order Number: ', '');
