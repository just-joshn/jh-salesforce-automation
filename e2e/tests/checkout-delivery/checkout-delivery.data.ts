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

// Guest checkout fixture. The store rejects example.com addresses, so this uses a real-looking
// domain. The spec resolves an in-stock variant of the master at runtime.
export const checkout: CheckoutFixture = {
  masterId: '78916783M',
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
