import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { UiOrderableVariant } from '../../support/products';
import { bearer, withSite } from '../../support/scapi';
import type { Fault } from '../../support/scapi-types';
import type { CouponAttempt } from './prepare-cart.data';
import * as Endpoints from './prepare-cart.endpoints';

const authed = (accessToken: string, data?: unknown) => ({
  params: withSite(),
  headers: bearer(accessToken),
  ...(data !== undefined ? { data } : {}),
});

export const createBasket = (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> => request.post(Endpoints.baskets(), authed(accessToken, {}));

// One product page's worth of adding: the chosen variant, one unit.
export const addProductToCart = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  variant: UiOrderableVariant,
): Promise<APIResponse> =>
  request.post(
    Endpoints.basketItems(basketId),
    authed(accessToken, [{ productId: variant.variantId, quantity: 1 }]),
  );

export const openCart = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
): Promise<APIResponse> => request.get(Endpoints.basket(basketId), authed(accessToken));

export const increaseQuantity = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  itemId: string,
  quantity: number,
): Promise<APIResponse> =>
  request.patch(Endpoints.basketItem(basketId, itemId), authed(accessToken, { quantity }));

export const removeItem = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  itemId: string,
): Promise<APIResponse> =>
  request.delete(Endpoints.basketItem(basketId, itemId), authed(accessToken));

/**
 * Submit a promo code to the basket.
 *
 * Stands in for the browser journey opening the promo accordion and finding the
 * code box: what both assert is that reviewing a promotion from the cart is
 * offered. The status and fault envelope are returned unasserted here,
 * so the spec keeps that judgement.
 */
export const openPromoCode = async (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  code: string,
): Promise<CouponAttempt> => {
  const response = await request.post(
    Endpoints.basketCoupons(basketId),
    authed(accessToken, { code }),
  );
  if (response.ok()) return { status: response.status(), faultType: undefined };
  const fault = (await response.json()) as Fault;
  return { status: response.status(), faultType: fault.type };
};

/**
 * Hand the basket to checkout by making checkout's own first write, setting the
 * shopper the order will be placed for. Stands in for following the Proceed to
 * Checkout link and the checkout page rendering.
 */
export const proceedToCheckout = (
  request: APIRequestContext,
  accessToken: string,
  basketId: string,
  email: string,
): Promise<APIResponse> =>
  request.put(Endpoints.basketCustomer(basketId), authed(accessToken, { email }));
