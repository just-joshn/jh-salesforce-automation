import type { APIRequestContext } from '@playwright/test';
import type { UiOrderableVariant } from '../../support/products';
import { findUiOrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type { Basket, BasketProductItem, Product, ProductVariant } from '../../support/scapi-types';

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

export interface ProductListItem {
  id?: string;
  productId?: string;
  priority: number;
  public: boolean;
  quantity: number;
  type?: 'product' | 'gift_certificate';
}

export interface ProductList {
  id?: string;
  name?: string;
  public?: boolean;
  type?: 'wish_list' | 'gift_registry' | 'shopping_list' | 'custom_1' | 'custom_2' | 'custom_3';
  customerProductListItems?: ProductListItem[];
}

export const password = 'Test1234!';

const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

export const newCredentials = (): ShopperCredentials => ({ email: uniqueEmail(), password });

export const registrant = (credentials: ShopperCredentials): RegistrationInput => ({
  firstName: 'Test',
  lastName: 'Portfolio',
  email: credentials.email,
  password: credentials.password,
});

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

export const wishlistRequest = () => ({
  name: 'Wishlist',
  public: false,
  type: 'wish_list' as const,
});

export const wishlistItemRequest = (productId: string): ProductListItem => ({
  priority: 1,
  productId,
  public: false,
  quantity: 1,
  type: 'product',
});

export const basketItemRequest = (variantId: string) => [{ productId: variantId, quantity: 1 }];

export const productListFrom = (value: unknown): ProductList => value as ProductList;

export const productListItemFrom = (value: unknown): ProductListItem => value as ProductListItem;

export const itemFor = (list: ProductList, productId: string): ProductListItem => {
  const item = (list.customerProductListItems ?? []).find(
    (candidate) => candidate.productId === productId,
  );
  return required(item, `wishlist product ${productId}`);
};

export const variationDisplayName = (productDetail: Product, attributeId: string): string => {
  const selectedValue = required(
    productDetail.variationValues?.[attributeId],
    `${attributeId} variation value`,
  );
  const attribute = required(
    productDetail.variationAttributes?.find((candidate) => candidate.id === attributeId),
    `${attributeId} variation attribute`,
  );
  const value = required(
    attribute.values?.find((candidate) => candidate.value === selectedValue),
    `${attributeId} variation ${selectedValue}`,
  );
  return required(value.name, `${attributeId} variation display name`);
};

export const variantFromMaster = (master: Product, variantId: string): ProductVariant => {
  const variant = (master.variants ?? []).find((candidate) => candidate.productId === variantId);
  return required(variant, `master variant ${variantId}`);
};

export const variantDisplayName = (
  master: Product,
  variant: ProductVariant,
  attributeId: string,
): string => {
  const selectedValue = required(
    variant.variationValues?.[attributeId],
    `${attributeId} variant value`,
  );
  const attribute = required(
    master.variationAttributes?.find((candidate) => candidate.id === attributeId),
    `${attributeId} variation attribute`,
  );
  const value = required(
    attribute.values?.find((candidate) => candidate.value === selectedValue),
    `${attributeId} variation ${selectedValue}`,
  );
  return required(value.name, `${attributeId} variation display name`);
};

export const hasVariationAttribute = (master: Product, attributeId: string): boolean =>
  (master.variationAttributes ?? []).some((attribute) => attribute.id === attributeId);

export const isMasterProduct = (productDetail: Product): boolean =>
  productDetail.type?.master === true;

export const isVariantProduct = (productDetail: Product): boolean =>
  productDetail.type?.variant === true;

export const isOrderableProduct = (productDetail: Product): boolean =>
  productDetail.inventory?.orderable === true;

export const basketLineFor = (basket: Basket, variantId: string): BasketProductItem => {
  const line = (basket.productItems ?? []).find((item) => item.productId === variantId);
  return required(line, `basket product ${variantId}`);
};
