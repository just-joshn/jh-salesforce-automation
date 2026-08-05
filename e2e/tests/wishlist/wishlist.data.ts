import type { APIRequestContext } from '@playwright/test';
import type { UiOrderableVariant } from '../../../api/support/products';
import { findUiOrderableVariant } from '../../../api/support/products';
import { bearer, shopperApiUrl, withSite } from '../../../api/support/scapi';
import { getGuestToken } from '../../../api/support/slas';

export interface ShopperCredentials {
  email: string;
  password: string;
}

export const password = 'Test1234!';

// New email every run.
const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

// A throwaway shopper per test so parallel runs never share a wishlist.
export const newCredentials = (): ShopperCredentials => ({ email: uniqueEmail(), password });

// A completed sign-in lands on the account landing route.
export const accountUrlPattern = /\/account\/?$/;

// Main product id. The in-stock color/size is resolved at run time.
export const product = { masterId: '25591139M' };

// Pick a color/size that is in stock right now; the demo store's stock keeps moving.
export const orderableVariant = async (request: APIRequestContext): Promise<UiOrderableVariant> => {
  const { accessToken } = await getGuestToken(request);
  return findUiOrderableVariant(request, accessToken, product.masterId);
};

// Make the account over the API so the browser only does shopper-visible steps.
export const provisionCustomer = async (
  request: APIRequestContext,
  credentials: ShopperCredentials,
): Promise<void> => {
  const { accessToken } = await getGuestToken(request);
  const created = await request.post(shopperApiUrl('customer/shopper-customers/v1', 'customers'), {
    params: withSite(),
    headers: bearer(accessToken),
    data: {
      customer: {
        firstName: 'Test',
        lastName: 'Portfolio',
        email: credentials.email,
        login: credentials.email,
      },
      password: credentials.password,
    },
  });
  if (!created.ok()) {
    throw new Error(
      `registering ${credentials.email} failed (${created.status()}): ${await created.text()}`,
    );
  }
};

// Detail lines the wishlist item renders for a chosen variant.
export const colorLabel = (color: string): string => `Color: ${color}`;
export const sizeLabel = (size: string): string => `Size: ${size}`;
