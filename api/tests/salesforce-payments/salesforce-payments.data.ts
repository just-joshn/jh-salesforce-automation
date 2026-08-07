import type { APIRequestContext } from '@playwright/test';
import type { SfPaymentsConfig } from '../../support/app-config';
import { readStorefrontAppConfig } from '../../support/app-config';
import type { UiOrderableVariant } from '../../support/products';
import { findUiOrderableVariant } from '../../support/products';
import { bearer, required, withSite } from '../../support/scapi';
import type { SiteConfiguration } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import * as Endpoints from './salesforce-payments.endpoints';

export interface ExpressPlacements {
  pdp: boolean;
  miniCart: boolean;
  cart: boolean;
  checkout: boolean;
}

export interface SalesforcePaymentsCondition {
  met: boolean;
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

export interface PaymentCard {
  cardType: string;
  expirationMonth: number;
  expirationYear: number;
  holder: string;
  securityCode: string;
}

export interface SalesforcePaymentsUrls {
  sdkUrl: string;
  metadataUrl: string;
}

export const paymentsAllowed = 'SalesforcePaymentsAllowed';
const EXPRESS_PAGES = 'expressOnCheckoutPagesEnabled';
const deliveryMasterId = '25591139M';

export const shopperEmail = 'test.shopper@gmail.com';
export const shipmentId = 'me';
export const shippingMethodId = 'GBP001';
export const paymentMethodId = 'CREDIT_CARD';

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

export const paymentCard: PaymentCard = {
  cardType: 'Visa',
  expirationMonth: 12,
  expirationYear: 2030,
  holder: 'Test Shopper',
  securityCode: '123',
};

export const configurationMap = (resource: SiteConfiguration): Map<string, unknown> =>
  new Map(
    (resource.configurations ?? []).flatMap((entry) =>
      entry.id === undefined ? [] : [[entry.id, entry.value] as const],
    ),
  );

const siteConfigurations = async (request: APIRequestContext): Promise<Map<string, unknown>> => {
  const { accessToken } = await getGuestToken(request);
  const response = await request.get(Endpoints.configurations(), {
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
  return configurationMap((await response.json()) as SiteConfiguration);
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
  if (!configurations.has(paymentsAllowed)) {
    return [`Shopper Configuration does not expose ${paymentsAllowed} for this site`];
  }
  if (configurations.get(paymentsAllowed) !== true) {
    return [
      `Shopper Configuration reports ${paymentsAllowed}=false, so Commerce has not enabled it`,
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

export const salesforcePaymentsUrls = async (
  request: APIRequestContext,
): Promise<SalesforcePaymentsUrls> => {
  const app = await readStorefrontAppConfig(request);
  return {
    sdkUrl: required(app.sfPayments?.sdkUrl, 'app.sfPayments.sdkUrl'),
    metadataUrl: required(app.sfPayments?.metadataUrl, 'app.sfPayments.metadataUrl'),
  };
};

export const deliveryVariant = async (request: APIRequestContext): Promise<UiOrderableVariant> => {
  const { accessToken } = await getGuestToken(request);
  return findUiOrderableVariant(request, accessToken, deliveryMasterId);
};
