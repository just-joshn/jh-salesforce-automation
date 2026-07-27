export interface Credentials {
  email: string;
  password: string;
}

export interface SigninProduct {
  masterId: string;
}

export const password = 'Test1234!';

export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

// Main product id. Spec picks an in-stock size at run time.
export const product: SigninProduct = { masterId: '25591139M' };
