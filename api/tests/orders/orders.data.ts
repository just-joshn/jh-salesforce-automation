import type { APIRequestContext } from '@playwright/test';
import type { OrderableVariant } from '../../support/products';
import { findOrderableVariants } from '../../support/products';
import type { CustomerOrder, CustomerOrderResult } from '../../support/scapi-types';

export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
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

// Order list; no orders → missing array.
export const ordersOf = (history: CustomerOrderResult): CustomerOrder[] => history.data ?? [];

export const password = 'Test1234!';
// Main product id. The in-stock size is resolved at run time.
export const masterId = '25591139M';
export const quantity = 1;
export const shippingMethodId = 'GBP001';
export const paymentMethodId = 'CREDIT_CARD';
export const unknownOrderNo = 'BOGUS00000';

export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

export const registrant = (email: string): RegistrationInput => ({
  firstName: 'Test',
  lastName: 'Portfolio',
  email,
  password,
});

export const address: Address = {
  firstName: 'Test',
  lastName: 'Portfolio',
  phone: '4155551234',
  address1: '415 Mission St',
  city: 'San Francisco',
  stateCode: 'CA',
  postalCode: '94105',
  countryCode: 'US',
};

export const card: Card = {
  cardType: 'Visa',
  expirationMonth: 12,
  expirationYear: 2030,
  holder: 'Test Portfolio',
  securityCode: '123',
};

// A size that is in stock right now; the demo store's stock keeps moving.
export const orderableVariant = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<OrderableVariant> => {
  const [variant] = await findOrderableVariants(request, accessToken, { masterId, minCount: 1 });
  if (!variant) throw new Error('expected an orderable variant');
  return variant;
};
