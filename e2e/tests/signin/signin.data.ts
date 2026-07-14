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

// The White Dress Shirt master; the spec resolves an in-stock variant of it at runtime, since
// hardcoded variants go stale as the shared demo store's stock drains.
export const product: SigninProduct = { masterId: '78916783M' };
