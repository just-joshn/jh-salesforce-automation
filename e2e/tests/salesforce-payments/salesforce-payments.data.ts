import type { APIRequestContext, Request } from '@playwright/test';
import type { UiOrderableVariant } from '../../../api/support/products';
import { findUiOrderableVariant } from '../../../api/support/products';
import { bearer, shopperApiUrl, withSite } from '../../../api/support/scapi';
import type { SiteConfiguration } from '../../../api/support/scapi-types';
import { getGuestToken } from '../../../api/support/slas';
import type { SfPaymentsConfig } from '../../support/app-config';
import { readStorefrontAppConfig } from '../../support/app-config';

const CONFIGURATIONS = 'configuration/shopper-configurations/v1';

/** Where an express payment method can be invoked from, per site configuration. */
export interface ExpressPlacements {
  pdp: boolean;
  miniCart: boolean;
  cart: boolean;
  checkout: boolean;
}

/**
 * Whether this storefront is configured for the Salesforce Payments journey.
 *
 * The feature hook requires both local and server enablement, so the condition is
 * read from both sides:
 * - the app's own shipped configuration, for the flag, SDK URL and metadata URL.
 * - Shopper Configuration, for the Commerce-side permission the same hook reads.
 */
export interface SalesforcePaymentsCondition {
  met: boolean;
  /** Why the journey does or does not exist here, for the skip annotation. */
  reason: string;
  placements: ExpressPlacements;
}

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

/** Commerce-side permission the Salesforce Payments hook requires. */
const PAYMENTS_ALLOWED = 'SalesforcePaymentsAllowed';

/** Site configuration listing the pages express methods may be invoked from. */
const EXPRESS_PAGES = 'expressOnCheckoutPagesEnabled';

const deliveryMasterId = '25591139M';

export const shopperEmail = 'test.shopper@gmail.com';

export const homeAddress: Address = {
  firstName: 'Test',
  lastName: 'Shopper',
  phone: '4155551234',
  address1: '415 Mission St',
  city: 'San Francisco',
  stateCode: 'CA',
  postalCode: '94105',
  countryCode: 'US',
};

// --- The condition, proven before the browser starts ---

/**
 * Shopper Configuration, the service the storefront's own payments hook reads its
 * server-side enablement from.
 *
 * A server fault throws instead of returning nothing, so a broken shop never
 * reads as "this journey does not apply here".
 */
const siteConfigurations = async (request: APIRequestContext): Promise<Map<string, unknown>> => {
  const { accessToken } = await getGuestToken(request);
  const response = await request.get(shopperApiUrl(CONFIGURATIONS, 'configurations'), {
    params: withSite(),
    headers: bearer(accessToken),
  });
  if (response.status() >= 500) {
    throw new Error(
      `Shopper Configuration is failing (${response.status()}): ${await response.text()}; ` +
        'the Salesforce Payments condition could not be established',
    );
  }
  if (!response.ok()) return new Map();

  const resource = (await response.json()) as SiteConfiguration;
  return new Map(
    (resource.configurations ?? []).flatMap((entry) =>
      entry.id === undefined ? [] : [[entry.id, entry.value] as const],
    ),
  );
};

const flagReason = (sfPayments: SfPaymentsConfig | undefined): string[] =>
  sfPayments?.enabled === true
    ? []
    : ['app.sfPayments.enabled is not true, so the local flag is off'];

const sdkReason = (sfPayments: SfPaymentsConfig | undefined): string[] =>
  (sfPayments?.sdkUrl ?? '') === ''
    ? ['app.sfPayments.sdkUrl is empty, so there is no payment SDK to load']
    : [];

const metadataReason = (sfPayments: SfPaymentsConfig | undefined): string[] =>
  (sfPayments?.metadataUrl ?? '') === ''
    ? ['app.sfPayments.metadataUrl is empty, so payment metadata cannot be resolved']
    : [];

const localReasons = (sfPayments: SfPaymentsConfig | undefined): string[] => [
  ...flagReason(sfPayments),
  ...sdkReason(sfPayments),
  ...metadataReason(sfPayments),
];

const serverReasons = (configurations: Map<string, unknown>): string[] => {
  if (!configurations.has(PAYMENTS_ALLOWED)) {
    return [`Shopper Configuration does not expose ${PAYMENTS_ALLOWED} for this site`];
  }
  if (configurations.get(PAYMENTS_ALLOWED) !== true) {
    return [
      `Shopper Configuration reports ${PAYMENTS_ALLOWED}=false, so Commerce has not enabled it`,
    ];
  }
  return [];
};

const placementsFrom = (configurations: Map<string, unknown>): ExpressPlacements => {
  const pages = configurations.get(EXPRESS_PAGES);
  const enabled = Array.isArray(pages) ? pages : [];
  return {
    pdp: enabled.includes('PDP'),
    miniCart: enabled.includes('MINICART'),
    cart: enabled.includes('CART'),
    checkout: enabled.includes('CHECKOUT'),
  };
};

export const salesforcePaymentsCondition = async (
  request: APIRequestContext,
): Promise<SalesforcePaymentsCondition> => {
  const app = await readStorefrontAppConfig(request);
  const configurations = await siteConfigurations(request);
  const reasons = [...localReasons(app.sfPayments), ...serverReasons(configurations)];

  return {
    met: reasons.length === 0,
    reason:
      reasons.length === 0
        ? 'Salesforce Payments is enabled both locally and in Commerce configuration'
        : `the Salesforce Payments journey is not configured on this storefront: ${reasons.join('; ')}`,
    placements: placementsFrom(configurations),
  };
};

// Sizes are resolved at run time. The demo store's stock keeps moving.
export const deliveryVariant = async (request: APIRequestContext): Promise<UiOrderableVariant> => {
  const { accessToken } = await getGuestToken(request);
  return findUiOrderableVariant(request, accessToken, deliveryMasterId);
};

// --- Reading the storefront's own traffic, to place each step on a service ---

const pathOf = (request: Request): string => new URL(request.url()).pathname;

/** Shopper Configuration: the read the payments hook gates itself on. */
export const configurationCall = (request: Request): boolean =>
  request.method() === 'GET' && pathOf(request).includes(`/${CONFIGURATIONS}/`);

/**
 * The app's own metadata proxy, which is how the Salesforce Payments backend's
 * metadata reaches the SDK.
 */
export const paymentMetadataCall = (request: Request): boolean =>
  pathOf(request).endsWith('/api/payment-metadata');

/** Shopper Baskets V2: the writes that prepare the basket for the payment. */
export const basketPrepareCall = (request: Request): boolean =>
  ['POST', 'PUT', 'PATCH'].includes(request.method()) &&
  pathOf(request).includes('/checkout/shopper-baskets/v2/');

/** Shopper Orders: the call that creates the Commerce order. */
export const orderCreateCall = (request: Request): boolean =>
  request.method() === 'POST' &&
  pathOf(request).includes('/checkout/shopper-orders/v1/') &&
  pathOf(request).endsWith('/orders');

/** The SDK bundle the storefront was configured to load. */
export const sdkScriptUrl = async (request: APIRequestContext): Promise<string> => {
  const app = await readStorefrontAppConfig(request);
  return app.sfPayments?.sdkUrl ?? '';
};

// --- Wording and routes the payments checkout renders ---

export const expressCheckoutHeading = 'Express Checkout';

export const cartBadgeLabel = (count: number): string => `My cart, number of items: ${count}`;

export const confirmationUrlPattern = /\/checkout\/confirmation\/\d+/;
