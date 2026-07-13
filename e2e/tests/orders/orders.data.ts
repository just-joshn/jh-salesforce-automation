export interface Credentials {
  email: string;
  password: string;
}

export const password = 'Test1234!';

export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

// Address for the order provisioned ahead of time via the data API.
export const orderAddress = {
  firstName: 'Test',
  lastName: 'Portfolio',
  address1: '415 Mission St',
  city: 'San Francisco',
  stateCode: 'CA',
  postalCode: '94105',
  countryCode: 'US',
  phone: '4155551234',
};

export const orderVariantId = '78916783M-1';
