import type { APIRequestContext } from '@playwright/test';
import type { UiOrderableVariant } from '../../../../api/support/products';
import { findUiOrderableVariant } from '../../../../api/support/products';
import { getGuestToken } from '../../../../api/support/slas';

export interface CartFixture {
  keptMasterId: string;
  removedMasterId: string;
}

// Two different products, so one line can go and another can stay.
export const cartProducts: CartFixture = {
  keptMasterId: '25591139M',
  removedMasterId: '25518484M',
};

// Both sizes are resolved at run time; the demo store's stock keeps moving.
export const orderableVariants = async (
  request: APIRequestContext,
): Promise<[UiOrderableVariant, UiOrderableVariant]> => {
  const { accessToken } = await getGuestToken(request);
  const kept = await findUiOrderableVariant(request, accessToken, cartProducts.keptMasterId);
  const removed = await findUiOrderableVariant(request, accessToken, cartProducts.removedMasterId);

  // Same size twice would merge into one cart line and there would be nothing to remove.
  if (kept.variantId === removed.variantId) {
    throw new Error(
      `products ${cartProducts.keptMasterId} and ${cartProducts.removedMasterId} both resolved to ` +
        `variant ${kept.variantId}; the demo store's stock has likely changed`,
    );
  }
  return [kept, removed];
};

const items = (count: number): string => (count === 1 ? 'item' : 'items');

export const cartHeading = (count: number): string => `Cart (${count} ${items(count)})`;

// The cart groups lines by how they are handed over; plural is fixed in the label.
export const deliveryGroupLabel = (count: number): string =>
  `Delivery - ${count} out of ${count} items`;

// Value the fulfillment picker holds while a line ships to an address.
export const deliveryOption = 'delivery';

export const checkoutUrl = (url: URL): boolean => url.pathname.endsWith('/checkout');
