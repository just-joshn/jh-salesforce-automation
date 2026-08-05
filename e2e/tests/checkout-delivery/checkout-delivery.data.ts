import type { APIRequestContext } from '@playwright/test';
import type { UiOrderableVariant } from '../../../api/support/products';
import { findUiOrderableVariant } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';

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
  number: string;
  expiry: string;
  securityCode: string;
  holder: string;
}

export interface CheckoutFixture {
  masterId: string;
  email: string;
  address: Address;
  card: Card;
}

// Guest checkout data. No example.com emails (store rejects them).
export const checkout: CheckoutFixture = {
  masterId: '25591139M',
  email: 'test.shopper@gmail.com',
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
    number: '4111111111111111',
    expiry: '12/30',
    securityCode: '123',
    holder: 'Test Shopper',
  },
};

// Pick a size that is in stock right now; the demo store's stock keeps moving.
export const orderableVariant = async (request: APIRequestContext): Promise<UiOrderableVariant> => {
  const { accessToken } = await getGuestToken(request);
  return findUiOrderableVariant(request, accessToken, checkout.masterId);
};

// A placed order lands on the numbered confirmation route.
export const confirmationUrlPattern = /\/checkout\/confirmation\/\d+/;
