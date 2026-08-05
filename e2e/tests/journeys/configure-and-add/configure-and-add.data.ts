import type { APIRequestContext } from '@playwright/test';
import type { UiOrderableVariant } from '../../../../api/support/products';
import { findUiOrderableVariant } from '../../../../api/support/products';
import { getGuestToken } from '../../../../api/support/slas';

export interface ConfigurationFixture {
  masterId: string;
  /** More than one, so the basket has to carry the chosen amount. */
  quantity: number;
}

// Main product id. The in-stock size is resolved at run time.
export const configuration: ConfigurationFixture = { masterId: '25591139M', quantity: 2 };

// Only sizes with stock to spare are offered, so quantity 2 is always safe.
export const orderableVariant = async (request: APIRequestContext): Promise<UiOrderableVariant> => {
  const { accessToken } = await getGuestToken(request);
  return findUiOrderableVariant(request, accessToken, configuration.masterId);
};

const items = (quantity: number): string => (quantity === 1 ? 'item' : 'items');

export const addedToCartHeading = (quantity: number): string =>
  `${quantity} ${items(quantity)} added to cart`;

export const colorLabel = (colorName: string): string => `Color: ${colorName}`;
export const sizeLabel = (sizeName: string): string => `Size: ${sizeName}`;
export const quantityLabel = (quantity: number): string => `Qty: ${quantity}`;
export const cartHeading = (quantity: number): string => `Cart (${quantity} ${items(quantity)})`;

// Value the cart's fulfillment picker holds while the line ships to an address.
export const deliveryOption = 'delivery';
