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

export interface RouteProbe {
  readonly status: number;
  readonly url: string;
}

export const expected = Object.freeze({ basketStatus: 200 });

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

export const formatHybridGateSkipReason = (probes: readonly RouteProbe[]): string =>
  `Journey skipped: unavailable SFRA routes: ${probes
    .map((probe) => `${probe.url} (HTTP ${probe.status})`)
    .join(', ')}.`;

export const hybridRuntimeAvailable = (probes: readonly RouteProbe[]): boolean =>
  probes.every((probe) => probe.status >= 200 && probe.status < 400);
