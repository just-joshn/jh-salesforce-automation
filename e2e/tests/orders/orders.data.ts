export interface Credentials {
  email: string;
  password: string;
}

export const password = 'Test1234!';

export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

// Address used when API places the order.
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

// Main product id. Setup picks an in-stock size at run time.
export const orderMasterId = '25591139M';
