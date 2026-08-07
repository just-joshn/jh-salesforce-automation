import type { APIRequestContext } from '@playwright/test';
import type { StorefrontAppConfig } from '../../support/app-config';
import { readStorefrontAppConfig } from '../../support/app-config';
import type { UiOrderableVariant } from '../../support/products';
import { findUiOrderableVariant } from '../../support/products';
import { bearer, withSite } from '../../support/scapi';
import type { Customer, Order, OrderShipment } from '../../support/scapi-types';
import { getGuestToken, loginRegisteredShopper, requireSession } from '../../support/slas';
import * as Endpoints from './one-click-checkout.endpoints';

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

export interface SavedPaymentCard {
  cardType: string;
  number: string;
  expirationMonth: number;
  expirationYear: number;
  securityCode: string;
  holder: string;
}

export interface SavedDataShopper {
  email: string;
  password: string;
  address: Address;
}

export interface OneClickCondition {
  met: boolean;
  reason: string;
}

export const password = 'Test1234!';

export const card: Card = {
  number: '4111111111111111',
  expiry: '12/30',
  securityCode: '123',
  holder: 'Test Shopper',
};

export const savedPaymentCard: SavedPaymentCard = {
  cardType: 'Visa',
  number: card.number,
  expirationMonth: 12,
  expirationYear: 2030,
  securityCode: card.securityCode,
  holder: card.holder,
};

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
export const shipmentId = 'me';
export const shippingMethodId = 'GBP001';
export const paymentMethodId = 'CREDIT_CARD';
const deliveryMasterId = '25591139M';

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

export const oneClickCondition = async (request: APIRequestContext): Promise<OneClickCondition> => {
  const app = await readStorefrontAppConfig(request);
  const reasons = unmetReasons(app);
  return { met: reasons.length === 0, reason: conditionReason(reasons) };
};

export const uniqueEmail = (): string =>
  `qa.oneclick.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

const createCustomer = async (
  request: APIRequestContext,
  guestToken: string,
  email: string,
): Promise<void> => {
  const created = await request.post(Endpoints.customers(), {
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
  const saved = await request.post(Endpoints.customerAddresses(customerId), {
    params: withSite(),
    headers: bearer(accessToken),
    data: { addressId: savedAddressId, ...savedAddress, preferred: true },
  });
  if (!saved.ok()) {
    throw new Error(
      `saving the address book entry for ${customerId} failed (${saved.status()}): ${await saved.text()}`,
    );
  }
};

export const savedDataShopper = async (request: APIRequestContext): Promise<SavedDataShopper> => {
  const email = uniqueEmail();
  const { accessToken: guestToken } = await getGuestToken(request);
  await createCustomer(request, guestToken, email);
  const login = await loginRegisteredShopper(request, email, password);
  const { accessToken, customerId } = requireSession(login, email);
  await saveAddressBookEntry(request, accessToken, customerId);
  return { email, password, address: savedAddress };
};

export const deliveryVariant = async (request: APIRequestContext): Promise<UiOrderableVariant> => {
  const { accessToken } = await getGuestToken(request);
  return findUiOrderableVariant(request, accessToken, deliveryMasterId);
};

export const savedAddressFrom = (
  customer: Customer,
): NonNullable<Customer['addresses']>[number] | undefined =>
  customer.addresses?.find((address) => address.addressId === savedAddressId);

export const shipmentFrom = (order: Order): OrderShipment => {
  const shipment = order.shipments?.find((candidate) => candidate.shipmentId === shipmentId);
  if (shipment === undefined) throw new Error(`order has no shipment ${shipmentId}`);
  return shipment;
};
