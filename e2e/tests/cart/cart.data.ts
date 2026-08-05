import type { APIRequestContext } from '@playwright/test';
import type { UiOrderableVariant } from '../../../api/support/products';
import { findUiOrderableVariant } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';

export interface CartProductFixture {
  masterId: string;
}

// Main product id. The in-stock size is resolved at run time.
export const cartProduct: CartProductFixture = {
  masterId: '25591139M',
};

// Pick a size that is in stock right now; the demo store's stock keeps moving.
export const orderableVariant = async (request: APIRequestContext): Promise<UiOrderableVariant> => {
  const { accessToken } = await getGuestToken(request);
  return findUiOrderableVariant(request, accessToken, cartProduct.masterId);
};

// The cart hands off to the checkout route.
export const checkoutUrl = (url: URL): boolean => url.pathname.endsWith('/checkout');
