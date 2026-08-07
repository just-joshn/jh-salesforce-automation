import type { APIRequestContext, Request } from '@playwright/test';
import type { UiOrderableVariant } from '../../../api/support/products';
import { findUiOrderableVariant } from '../../../api/support/products';
import { bearer, shopperApiUrl, withSite } from '../../../api/support/scapi';
import { getGuestToken, loginRegisteredShopper, requireSession } from '../../../api/support/slas';
import type { StorefrontAppConfig } from '../../../api/support/app-config';
import { readStorefrontAppConfig } from '../../../api/support/app-config';

const CUSTOMERS = 'customer/shopper-customers/v1';

export interface Address {
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  city: string;
  stateCode: string;
  postalCode: string;
  countryCode: string;
}

export interface Card {
  number: string;
  expiry: string;
  securityCode: string;
  holder: string;
}

/** A returning shopper whose account already holds the checkout data to spend. */
export interface SavedDataShopper {
  email: string;
  password: string;
  address: Address;
}

/**
 * Whether this storefront is configured for the one-click checkout journey.
 *
 * Both halves of the condition come from the app's own shipped configuration.
 * One is the feature flag that switches the `/checkout` route. The other is the
 * passwordless setup the page's identity verification is built on.
 */
export interface OneClickCondition {
  met: boolean;
  /** Why the journey does or does not exist here, for the skip annotation. */
  reason: string;
}

export const password = 'Test1234!';

export const card: Card = {
  number: '4111111111111111',
  expiry: '12/30',
  securityCode: '123',
  holder: 'Test Shopper',
};

/** Address book entry the account is provisioned with, and checks out from. */
export const savedAddress: Address = {
  firstName: 'Test',
  lastName: 'Shopper',
  phone: '4155551234',
  address1: '415 Mission St',
  city: 'San Francisco',
  stateCode: 'CA',
  postalCode: '94105',
  countryCode: 'US',
};

export const savedAddressId = 'home';

const deliveryMasterId = '25591139M';

// --- The condition, proven before the browser starts ---

const routeReason = (app: StorefrontAppConfig): string[] =>
  app.oneClickCheckout?.enabled === true
    ? []
    : [
        'app.oneClickCheckout.enabled is not true, so the /checkout route renders the standard ' +
          'stepped checkout instead of the one-click page',
      ];

const passwordlessReason = (app: StorefrontAppConfig): string[] =>
  app.login?.passwordless?.enabled === true
    ? []
    : [
        'app.login.passwordless.enabled is not true, so the passwordless security prerequisite ' +
          'the one-click page verifies identity with is not configured',
      ];

const unmetReasons = (app: StorefrontAppConfig): string[] => [
  ...routeReason(app),
  ...passwordlessReason(app),
];

const conditionReason = (reasons: string[]): string =>
  reasons.length === 0
    ? 'one-click checkout and its passwordless prerequisite are both configured'
    : `the one-click checkout journey is not configured on this storefront: ${reasons.join('; ')}`;

/**
 * The journey only exists while the storefront is configured for it, so the
 * condition is read from the app's own configuration before the browser starts.
 *
 * A storefront that will not serve its configuration throws rather than skips.
 * A broken shop must never read as "this journey does not apply here".
 */
export const oneClickCondition = async (request: APIRequestContext): Promise<OneClickCondition> => {
  const app = await readStorefrontAppConfig(request);
  const reasons = unmetReasons(app);
  return { met: reasons.length === 0, reason: conditionReason(reasons) };
};

// --- The returning shopper, provisioned over the commerce API ---

// New email every run so parallel tests never share an account or its basket.
export const uniqueEmail = (): string =>
  `qa.oneclick.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

const createCustomer = async (
  request: APIRequestContext,
  guestToken: string,
  email: string,
): Promise<void> => {
  const created = await request.post(shopperApiUrl(CUSTOMERS, 'customers'), {
    params: withSite(),
    headers: bearer(guestToken),
    data: {
      customer: {
        firstName: savedAddress.firstName,
        lastName: savedAddress.lastName,
        email,
        login: email,
      },
      password,
    },
  });
  if (!created.ok()) {
    throw new Error(`registering ${email} failed (${created.status()}): ${await created.text()}`);
  }
};

const saveAddressBookEntry = async (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
): Promise<void> => {
  const saved = await request.post(shopperApiUrl(CUSTOMERS, `customers/${customerId}/addresses`), {
    params: withSite(),
    headers: bearer(accessToken),
    // preferred, so the one-click page offers it as the default delivery address.
    data: { addressId: savedAddressId, ...savedAddress, preferred: true },
  });
  if (!saved.ok()) {
    throw new Error(
      `saving the address book entry for ${customerId} failed (${saved.status()}): ${await saved.text()}`,
    );
  }
};

/**
 * A returning shopper the one-click page has something to retrieve for. The
 * account and its address book are made over Shopper Customers so the browser
 * only has to sign in and spend what the account already holds.
 */
export const savedDataShopper = async (request: APIRequestContext): Promise<SavedDataShopper> => {
  const email = uniqueEmail();
  const { accessToken: guestToken } = await getGuestToken(request);
  await createCustomer(request, guestToken, email);

  const login = await loginRegisteredShopper(request, email, password);
  const { accessToken, customerId } = requireSession(login, email);
  await saveAddressBookEntry(request, accessToken, customerId);

  return { email, password, address: savedAddress };
};

// Sizes are resolved at run time. The demo store's stock keeps moving.
export const deliveryVariant = async (request: APIRequestContext): Promise<UiOrderableVariant> => {
  const { accessToken } = await getGuestToken(request);
  return findUiOrderableVariant(request, accessToken, deliveryMasterId);
};

// --- Reading the storefront's own traffic, to place each step on a service ---

const pathOf = (request: Request): string => new URL(request.url()).pathname;

/**
 * Shopper Customers: the read that retrieves what the account holds. The
 * one-click page asks for the customer's addresses and payment methods, both of
 * which hang off the same customer resource.
 */
export const savedCheckoutDataCall = (request: Request): boolean =>
  request.method() === 'GET' && pathOf(request).includes(`/${CUSTOMERS}/`);

/** Shopper Baskets V2: the write that applies a chosen value to the basket. */
export const basketApplyCall = (request: Request): boolean =>
  ['POST', 'PUT', 'PATCH'].includes(request.method()) &&
  pathOf(request).includes('/checkout/shopper-baskets/v2/');

/** Shopper Orders: the call that turns the basket into an order. */
export const orderCreateCall = (request: Request): boolean =>
  request.method() === 'POST' &&
  pathOf(request).includes('/checkout/shopper-orders/v1/') &&
  pathOf(request).endsWith('/orders');

// --- Wording and routes the one-click page renders ---

export const savePaymentLabel = 'Save this payment method for future use';

export const cartBadgeLabel = (count: number): string => `My cart, number of items: ${count}`;

export const accountUrlPattern = /\/account\/?$/;
export const confirmationUrlPattern = /\/checkout\/confirmation\/\d+/;
