import type { APIRequestContext } from '@playwright/test';
import type { UiOrderableVariant } from '../../../api/support/products';
import { findUiOrderableVariant } from '../../../api/support/products';
import { bearer, shopperApiUrl, withSite } from '../../../api/support/scapi';
import { getGuestToken } from '../../../api/support/slas';

export interface Credentials {
  email: string;
  password: string;
}

export interface SigninProduct {
  masterId: string;
}

export const password = 'Test1234!';

export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

// A throwaway shopper per run so parallel tests never share a cart.
export const newCredentials = (): Credentials => ({ email: uniqueEmail(), password });

// Main product id. The in-stock size is resolved at run time.
export const product: SigninProduct = { masterId: '25591139M' };

// Pick a size that is in stock right now; the demo store's stock keeps moving.
export const orderableVariant = async (request: APIRequestContext): Promise<UiOrderableVariant> => {
  const { accessToken } = await getGuestToken(request);
  return findUiOrderableVariant(request, accessToken, product.masterId);
};

// Make the account over the API so the browser stays a guest until it signs in.
export const provisionCustomer = async (
  request: APIRequestContext,
  credentials: Credentials,
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
