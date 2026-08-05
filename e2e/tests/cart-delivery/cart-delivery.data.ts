import type { APIRequestContext } from '@playwright/test';
import type { UiOrderableVariant } from '../../../api/support/products';
import { findUiOrderableVariant } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';

export interface DeliveryProductFixture {
  masterId: string;
}

// Main product id. The in-stock size is resolved at run time.
export const deliveryProduct: DeliveryProductFixture = {
  masterId: '25591139M',
};

// Pick a size that is in stock right now; the demo store's stock keeps moving.
export const orderableVariant = async (request: APIRequestContext): Promise<UiOrderableVariant> => {
  const { accessToken } = await getGuestToken(request);
  return findUiOrderableVariant(request, accessToken, deliveryProduct.masterId);
};

// The add-to-cart confirmation lists the quantity under this label.
export const quantityLabel = 'Qty';
