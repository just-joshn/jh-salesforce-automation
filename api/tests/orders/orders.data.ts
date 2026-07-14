export interface Credentials {
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

export interface OrderSummary {
  orderNo?: string;
  status?: string;
  creationDate?: string;
  orderTotal?: number;
}

export interface OrderHistory {
  total: number;
  data?: OrderSummary[];
}

export interface OrderDetail {
  orderNo?: string;
  status?: string;
  orderTotal?: number;
}

// Order summaries from a history response; an account with no orders omits the array.
export const ordersOf = (history: OrderHistory): OrderSummary[] => history.data ?? [];

export const password = 'Test1234!';
// Master product the spec picks an in-stock variant of at runtime; a hardcoded one goes stale.
export const masterId = '78916783M';
export const shippingMethodId = 'GBP001';
export const unknownOrderNo = 'BOGUS00000';

export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

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
