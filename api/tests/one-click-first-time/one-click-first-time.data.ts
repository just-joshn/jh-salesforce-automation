import { randomUUID } from 'node:crypto';

import { env } from '../../../config/env';
import type { OrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type { Basket, Order, ShippingMethodResult } from '../../support/scapi-types';

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

export type OtpRequest = Readonly<Record<string, string>> & {
  readonly channel_id: string;
  readonly client_id: string;
  readonly email: string;
  readonly locale: string;
  readonly mode: 'email';
  readonly user_id: string;
};

export type OtpVerificationRequest = Readonly<Record<string, string>> & {
  readonly channel_id: string;
  readonly client_id: string;
  readonly pwd_action_token: string;
  readonly user_id: string;
};

export interface BasketPaymentInstrumentRequest {
  readonly amount: number;
  readonly paymentCard: {
    readonly cardType: string;
    readonly expirationMonth: number;
    readonly expirationYear: number;
    readonly holder: string;
    readonly maskedNumber: string;
  };
  readonly paymentMethodId: string;
}

export interface CustomerPaymentInstrumentRequest {
  readonly default: boolean;
  readonly paymentCard: {
    readonly cardType: string;
    readonly expirationMonth: number;
    readonly expirationYear: number;
    readonly holder: string;
    readonly issueNumber: string;
    readonly number: string;
    readonly validFromMonth: number;
    readonly validFromYear: number;
  };
  readonly paymentMethodId: string;
}

export interface BasketInput<TBody> {
  readonly basketId: string;
  readonly body: TBody;
}

export interface CustomerPaymentInput {
  readonly body: CustomerPaymentInstrumentRequest;
  readonly customerId: string;
}

export interface OrderRequest {
  readonly basketId: string;
}

export interface CheckoutInput {
  readonly customer: { readonly email: string };
  readonly items: readonly { readonly productId: string; readonly quantity: number }[];
  readonly shippingAddress: AddressRequest;
}

export const expected = Object.freeze({
  loginStatus: 303,
  orderNumberPattern: /^\d{8}$/,
  orderStatus: 'new',
  otpRequestStatus: 202,
  otpVerificationStatus: 204,
  paymentMethodId: 'CREDIT_CARD',
  successStatus: 200,
});
export const emptyBasketRequest = Object.freeze({});

export const customerPaymentInstrumentRequest: CustomerPaymentInstrumentRequest = Object.freeze({
  default: true,
  paymentCard: Object.freeze({
    cardType: 'Visa',
    expirationMonth: 12,
    expirationYear: 2030,
    holder: 'CUJ First-Time Shopper',
    issueNumber: '1',
    number: '4111111111111111',
    validFromMonth: 1,
    validFromYear: 2024,
  }),
  paymentMethodId: expected.paymentMethodId,
});

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

export const otpRequestFor = (shopper: FirstTimeShopper): OtpRequest =>
  Object.freeze({
    channel_id: env.SFCC_SITE_ID,
    client_id: env.SFCC_CLIENT_ID,
    email: shopper.email,
    locale: env.E2E_LOCALE,
    mode: 'email',
    user_id: shopper.email,
  });

export const otpVerificationFor = (
  shopper: FirstTimeShopper,
  otp: string,
): OtpVerificationRequest =>
  Object.freeze({
    channel_id: env.SFCC_SITE_ID,
    client_id: env.SFCC_CLIENT_ID,
    pwd_action_token: otp,
    user_id: shopper.email,
  });

export const checkoutInputFor = (variant: OrderableVariant): CheckoutInput =>
  Object.freeze({
    customer: Object.freeze({
      email: `cuj5-checkout-${Date.now()}-${randomUUID().replaceAll('-', '')}@mailinator.com`,
    }),
    items: Object.freeze([{ productId: variant.variantId, quantity: 1 }]),
    shippingAddress,
  });

export const registeredCheckoutInputFor = (
  variant: OrderableVariant,
  shopper: FirstTimeShopper,
): CheckoutInput =>
  Object.freeze({
    customer: Object.freeze({ email: shopper.email }),
    items: Object.freeze([{ productId: variant.variantId, quantity: 1 }]),
    shippingAddress,
  });

export const basketPaymentInstrumentFor = (basket: Basket): BasketPaymentInstrumentRequest => ({
  amount: required(basket.orderTotal, 'basket.orderTotal'),
  paymentCard: {
    cardType: 'Visa',
    expirationMonth: 12,
    expirationYear: 2030,
    holder: 'CUJ First-Time Shopper',
    maskedNumber: '************1111',
  },
  paymentMethodId: expected.paymentMethodId,
});

export const orderRequestFor = (basketId: string): OrderRequest => ({ basketId });

export const orderNoFrom = (order: Order): string => required(order.orderNo, 'order.orderNo');

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
