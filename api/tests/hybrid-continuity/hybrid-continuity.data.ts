import type { SfraRouteProbe } from '../../support/gates';
import type { OrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type { Basket } from '../../support/scapi-types';

export interface BasketItemInput {
  readonly basketId: string;
  readonly body: readonly ProductItemRequest[];
}

interface ProductItemRequest {
  readonly productId: string;
  readonly quantity: number;
}

export type RouteProbe = SfraRouteProbe;

interface StoredCookie {
  readonly name: string;
  readonly value: string;
}

interface StoredState {
  readonly cookies: readonly StoredCookie[];
}

export const expected = Object.freeze({ basketStatus: 200, sfraStatus: 200 });

export const emptyBasketRequest = Object.freeze({});

export const sessionCookieName = 'dwsid';

export const basketIdFrom = (basket: Basket): string =>
  required(basket.basketId, 'basket.basketId');

const isBasket = (value: unknown): value is Basket =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const basketFrom = (value: unknown): Basket => {
  if (!isBasket(value)) {
    throw new Error('Shopper Baskets response is not a basket object');
  }

  return value;
};

export const createBasketItemInput = (
  basketId: string,
  variant: OrderableVariant,
): BasketItemInput => ({
  basketId,
  body: [{ productId: variant.variantId, quantity: 1 }],
});

export const sessionCookieFrom = (state: StoredState): string | undefined =>
  state.cookies.find((cookie) => cookie.name === sessionCookieName)?.value;
