import type { APIRequestContext } from '@playwright/test';
import type { UiOrderableVariant } from '../../../api/support/products';
import { findUiOrderableVariant } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';

export interface PickupProductFixture {
  masterId: string;
  storeCountry: string;
  storePostalCode: string;
  storeName: string;
}

// Main product id. Store search US/01801 → Woburn Retail Store.
export const pickupProduct: PickupProductFixture = {
  masterId: '25591139M',
  storeCountry: 'United States',
  storePostalCode: '01801',
  storeName: 'Woburn Retail Store',
};

// Pick a size that is in stock right now; the demo store's stock keeps moving.
export const orderableVariant = async (request: APIRequestContext): Promise<UiOrderableVariant> => {
  const { accessToken } = await getGuestToken(request);
  return findUiOrderableVariant(request, accessToken, pickupProduct.masterId);
};
