import type { APIRequestContext } from '@playwright/test';
import type { UiOrderableVariant } from '../../../api/support/products';
import { findUiOrderableVariant } from '../../../api/support/products';
import { bearer, shopperApiUrl, withSite } from '../../../api/support/scapi';
import type { RegisteredLogin } from '../../../api/support/slas';
import { getGuestToken, loginRegisteredShopper } from '../../../api/support/slas';

export interface ShopperCredentials {
  email: string;
  password: string;
}

export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export const password = 'Test1234!';
export const changedPassword = 'NewPass1234!';

// New email every run.
export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

export const registrant = (email: string): RegistrationInput => ({
  firstName: 'Test',
  lastName: 'Portfolio',
  email,
  password,
});

// A throwaway shopper per run so parallel tests never share a cart.
export const newCredentials = (): ShopperCredentials => ({ email: uniqueEmail(), password });

// A completed registration or sign-in lands on the account landing route.
export const accountUrlPattern = /\/account\/?$/;

// Rendered values that prove the account cards finished loading (not skeletons).
export const provisionedName = 'Test Portfolio';
export const maskedPassword = '••••••••';

// Main product id. The in-stock size is resolved at run time.
export const product = { masterId: '25591139M' };

// Pick a size that is in stock right now; the demo store's stock keeps moving.
export const orderableVariant = async (request: APIRequestContext): Promise<UiOrderableVariant> => {
  const { accessToken } = await getGuestToken(request);
  return findUiOrderableVariant(request, accessToken, product.masterId);
};

// Make the account over the API so the browser stays a guest until it signs in.
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

// SLAS password check, straight against the login service (no browser).
export const tryPasswordLogin = async (
  request: APIRequestContext,
  credentials: ShopperCredentials,
): Promise<RegisteredLogin> =>
  loginRegisteredShopper(request, credentials.email, credentials.password);
