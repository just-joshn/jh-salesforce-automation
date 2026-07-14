export interface Credentials {
  email: string;
  password: string;
}

export const password = 'Test1234!';

export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

// Address for the order the test creates up front through the API.
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

// Master product the setup step picks an in-stock variant of at runtime; a hardcoded
// variant would go stale as the demo store's stock sells out.
export const orderMasterId = '78916783M';
