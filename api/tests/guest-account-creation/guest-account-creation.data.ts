import type { APIRequestContext } from '@playwright/test';
import { readStorefrontAppConfig } from '../../support/app-config';
import type { UiOrderableVariant } from '../../support/products';
import { findUiOrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type { Basket, Customer, Order, OrderAddress } from '../../support/scapi-types';

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
export interface Registrant {
  email: string;
  password: string;
}
export interface GuestAccountCondition {
  met: boolean;
  reason: string;
}
export interface OrderIdentity {
  orderNo: string;
  email: string;
  firstName: string;
  lastName: string;
  deliveryAddresses: Address[];
  uniqueAddressCount: number;
}

const firstMasterId = '25591139M';
const secondMasterId = '25518484M';
export const deliveryMethodId = 'GBP001';
export const paymentMethodId = 'CREDIT_CARD';
export const password = 'Test1234!';
export const card: Card = {
  number: '4111111111111111',
  expiry: '12/30',
  securityCode: '123',
  holder: 'Test Shopper',
};
export const paymentCard = {
  cardType: 'Visa',
  expirationMonth: 12,
  expirationYear: 2030,
  holder: card.holder,
  securityCode: card.securityCode,
};
export const sharedAddress: Address = {
  firstName: 'Test',
  lastName: 'Shopper',
  phone: '4155551234',
  address1: '415 Mission St',
  city: 'San Francisco',
  stateCode: 'CA',
  postalCode: '94105',
  countryCode: 'US',
};
export const secondShipmentId = 'second-delivery';

export const guestAccountCondition = async (
  request: APIRequestContext,
): Promise<GuestAccountCondition> => {
  const app = await readStorefrontAppConfig(request);
  const oneClickEnabled = app.oneClickCheckout?.enabled === true;
  return {
    met: !oneClickEnabled,
    reason: oneClickEnabled
      ? 'app.oneClickCheckout.enabled is true, so the confirmation page hands account creation to the one-click flow and never renders the post-checkout account form'
      : 'one-click checkout is disabled, so the confirmation page offers the account form',
  };
};
export const uniqueEmail = (): string =>
  `qa.guestaccount.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;
export const registrant = (): Registrant => ({ email: uniqueEmail(), password });
export const twoDeliveryVariants = async (
  request: APIRequestContext,
): Promise<[UiOrderableVariant, UiOrderableVariant]> => {
  const { accessToken } = await import('../../support/slas').then(({ getGuestToken }) =>
    getGuestToken(request),
  );
  const first = await findUiOrderableVariant(request, accessToken, firstMasterId);
  const second = await findUiOrderableVariant(request, accessToken, secondMasterId);
  if (first.variantId === second.variantId) {
    throw new Error(
      `products ${firstMasterId} and ${secondMasterId} both resolved to variant ${first.variantId}`,
    );
  }
  return [first, second];
};

const normalize = (value: string): string => value.trim().toLowerCase();
const comparedFields = [
  'address1',
  'city',
  'countryCode',
  'firstName',
  'lastName',
  'postalCode',
  'stateCode',
] as const;
const isSameAddress = (left: Address, right: Address): boolean =>
  comparedFields.every((field) => normalize(left[field]) === normalize(right[field]));
const text = (value: string | undefined): string => value ?? '';
const toAddress = (resource: OrderAddress): Address => ({
  firstName: text(resource.firstName),
  lastName: text(resource.lastName),
  phone: text(resource.phone),
  address1: text(resource.address1),
  city: text(resource.city),
  stateCode: text(resource.stateCode),
  postalCode: text(resource.postalCode),
  countryCode: text(resource.countryCode),
});
const deliveryAddressesOf = (order: Order): Address[] =>
  (order.shipments ?? []).flatMap((shipment) =>
    shipment.c_fromStoreId !== undefined || shipment.shippingAddress === undefined
      ? []
      : [toAddress(shipment.shippingAddress)],
  );
const countUniqueAddresses = (addresses: Address[]): number => {
  const unique: Address[] = [];
  for (const address of addresses) {
    if (!unique.some((kept) => isSameAddress(kept, address))) unique.push(address);
  }
  return unique.length;
};
export const orderIdentityFrom = (order: Order): OrderIdentity => {
  const deliveryAddresses = deliveryAddressesOf(order);
  return {
    orderNo: required(order.orderNo, 'orderNo'),
    email: text(order.customerInfo?.email),
    firstName: text(order.billingAddress?.firstName),
    lastName: text(order.billingAddress?.lastName),
    deliveryAddresses,
    uniqueAddressCount: countUniqueAddresses(deliveryAddresses),
  };
};
export const savedAddressesFrom = (customer: Customer): Address[] =>
  (customer.addresses ?? []).map((address) => ({
    firstName: text(address.firstName),
    lastName: text(address.lastName),
    phone: text(address.phone),
    address1: text(address.address1),
    city: text(address.city),
    stateCode: text(address.stateCode),
    postalCode: text(address.postalCode),
    countryCode: address.countryCode,
  }));
export const hasAddress = (addresses: Address[], wanted: Address): boolean =>
  addresses.some((candidate) => isSameAddress(candidate, wanted));
export const basketLines = (basket: Basket) => basket.productItems ?? [];
export const orderIdentityFields = (order: Order) => ({
  orderNo: order.orderNo,
  email: order.customerInfo?.email,
  firstName: order.billingAddress?.firstName,
  lastName: order.billingAddress?.lastName,
});
