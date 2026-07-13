export interface Credentials {
  email: string;
  password: string;
}

export interface SigninProduct {
  masterId: string;
  variantId: string;
}

export const password = 'Test1234!';

export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

// White Dress Shirt; first color/size (White, 15L) gives variant 78916783M-1.
export const product: SigninProduct = { masterId: '78916783M', variantId: '78916783M-1' };
