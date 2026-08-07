import type { APIRequestContext } from '@playwright/test';
import type { UiOrderableVariant } from '../../support/products';
import { findUiOrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type { Basket, BasketProductItem } from '../../support/scapi-types';

export interface ShopperCredentials {
  email: string;
  password: string;
}

export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface CustomerBasketLine {
  productId?: string;
  quantity?: number;
}

export interface CustomerBasket {
  basketId?: string;
  productItems?: CustomerBasketLine[];
}

export interface CustomerBasketsResult {
  baskets?: CustomerBasket[];
  total: number;
}

export const password = 'Test1234!';
export const changedPassword = 'NewPass1234!';

export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

export const registrant = (email: string): RegistrationInput => ({
  firstName: 'Test',
  lastName: 'Portfolio',
  email,
  password,
});

export const newCredentials = (): ShopperCredentials => ({ email: uniqueEmail(), password });

export const product = { masterId: '25591139M' };

export const orderableVariant = (
  request: APIRequestContext,
  accessToken: string,
): Promise<UiOrderableVariant> => findUiOrderableVariant(request, accessToken, product.masterId);

export const registrationRequest = (input: RegistrationInput) => ({
  customer: {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    login: input.email,
  },
  password: input.password,
});

export const basketItemRequest = (variantId: string) => [{ productId: variantId, quantity: 1 }];

export const passwordChangeRequest = (currentPassword: string, nextPassword: string) => ({
  currentPassword,
  password: nextPassword,
});

export const customerBasketsFrom = (value: unknown): CustomerBasketsResult =>
  value as CustomerBasketsResult;

export const basketLineFor = (basket: Basket, productId: string): BasketProductItem => {
  const line = (basket.productItems ?? []).find((item) => item.productId === productId);
  return required(line, `basket product ${productId}`);
};

export const mergedBasketFor = (
  result: CustomerBasketsResult,
  productId: string,
): CustomerBasket => {
  const basket = (result.baskets ?? []).find((candidate) =>
    (candidate.productItems ?? []).some((item) => item.productId === productId),
  );
  return required(basket, `registered basket containing ${productId}`);
};

export const mergedLineFor = (basket: CustomerBasket, productId: string): CustomerBasketLine => {
  const line = (basket.productItems ?? []).find((item) => item.productId === productId);
  return required(line, `registered basket product ${productId}`);
};
