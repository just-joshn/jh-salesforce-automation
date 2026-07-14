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

// The White Dress Shirt master product. The spec picks an in-stock variant of it at runtime,
// because hardcoded variants go stale as the demo store's stock sells out.
export const product: SigninProduct = { masterId: '78916783M' };
