import { randomUUID } from 'node:crypto';

import type { OrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type { Basket, ShippingMethodResult } from '../../support/scapi-types';

export interface FirstTimeShopper {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly password: string;
}

export interface CustomerRegistrationRequest {
  readonly customer: {
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly login: string;
  };
  readonly password: string;
}

export interface AddressRequest {
  readonly address1: string;
  readonly city: string;
  readonly countryCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
  readonly postalCode: string;
  readonly stateCode: string;
}

export interface BasketItemInput {
  readonly basketId: string;
  readonly body: readonly { readonly productId: string; readonly quantity: number }[];
}

export interface BasketCustomerInput {
  readonly basketId: string;
  readonly body: { readonly email: string };
}

export interface ShipmentAddressInput {
  readonly basketId: string;
  readonly body: AddressRequest;
  readonly shipmentId: string;
}

export interface ShipmentMethodInput {
  readonly basketId: string;
  readonly body: { readonly id: string };
  readonly shipmentId: string;
}

export interface CheckoutInput {
  readonly customer: { readonly email: string };
  readonly items: readonly { readonly productId: string; readonly quantity: number }[];
  readonly shippingAddress: AddressRequest;
}

export const expected = Object.freeze({ successStatus: 200 });
export const emptyBasketRequest = Object.freeze({});

const shippingAddress: AddressRequest = Object.freeze({
  address1: '1 Market Street',
  city: 'San Francisco',
  countryCode: 'US',
  firstName: 'CUJ',
  lastName: 'FirstTime',
  phone: '4155550123',
  postalCode: '94105',
  stateCode: 'CA',
});

export const createFirstTimeShopper = (): FirstTimeShopper =>
  Object.freeze({
    email: `cuj5-api-${Date.now()}-${randomUUID().replaceAll('-', '')}@mailinator.com`,
    firstName: 'CUJ',
    lastName: 'FirstTime',
    password: 'Passw0rd!2026',
  });

export const customerRegistrationFor = (shopper: FirstTimeShopper): CustomerRegistrationRequest =>
  Object.freeze({
    customer: Object.freeze({
      email: shopper.email,
      firstName: shopper.firstName,
      lastName: shopper.lastName,
      login: shopper.email,
    }),
    password: shopper.password,
  });

export const checkoutInputFor = (variant: OrderableVariant): CheckoutInput =>
  Object.freeze({
    customer: Object.freeze({
      email: `cuj5-checkout-${Date.now()}-${randomUUID().replaceAll('-', '')}@mailinator.com`,
    }),
    items: Object.freeze([{ productId: variant.variantId, quantity: 1 }]),
    shippingAddress,
  });

export const basketIdFrom = (basket: Basket): string =>
  required(basket.basketId, 'basket.basketId');

export const shipmentIdFrom = (basket: Basket): string =>
  required(basket.shipments?.[0]?.shipmentId, 'basket.shipments[0].shipmentId');

export const shippingMethodInput = (
  basketId: string,
  shipmentId: string,
  methods: ShippingMethodResult,
): ShipmentMethodInput => ({
  basketId,
  body: {
    id: required(methods.defaultShippingMethodId, 'shippingMethods.defaultShippingMethodId'),
  },
  shipmentId,
});
