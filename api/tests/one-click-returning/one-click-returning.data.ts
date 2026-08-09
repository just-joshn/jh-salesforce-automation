import { randomUUID } from 'node:crypto';

import { env } from '../../../config/env';
import type { OrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type { Basket, Customer, ShippingMethodResult } from '../../support/scapi-types';

export interface ReturningShopper {
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

export interface BasketItemInput {
  readonly basketId: string;
  readonly body: readonly { readonly productId: string; readonly quantity: number }[];
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

export interface CustomerAddressRequest extends AddressRequest {
  readonly addressId: string;
  readonly preferred: boolean;
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

export interface CustomerResourceInput {
  readonly customerId: string;
}

export interface CustomerInput<TBody> extends CustomerResourceInput {
  readonly body: TBody;
}

export interface BasketInput<TBody> {
  readonly basketId: string;
  readonly body: TBody;
}

export interface ShipmentResourceInput {
  readonly basketId: string;
  readonly shipmentId: string;
}

export interface ShipmentInput<TBody> extends ShipmentResourceInput {
  readonly body: TBody;
}

export interface OrderRequest {
  readonly basketId: string;
}

export interface OrderResourceInput {
  readonly orderNo: string;
}

export interface ShippingMethodRequest {
  readonly id: string;
}

export type OneTimeCodeRequest = Readonly<Record<string, string>> & {
  readonly channel_id: string;
  readonly locale: string;
  readonly mode: string;
  readonly user_id: string;
  readonly usid: string;
};

export type OneTimeCodeVerificationRequest = Readonly<Record<string, string>> & {
  readonly client_id: string;
  readonly grant_type: string;
  readonly hint: string;
  readonly login_id: string;
  readonly pwdless_login_token: string;
};

type SavedPaymentInstrument = NonNullable<Customer['paymentInstruments']>[number];

export const expected = Object.freeze({
  confirmationStatus: 'confirmed',
  orderNumberPattern: /^\d{8}$/,
  orderStatus: 'new',
  successStatus: 200,
});
export const emptyBasketRequest = Object.freeze({});

export const createReturningShopper = (): ReturningShopper =>
  Object.freeze({
    email: `cuj4-api-${Date.now()}-${randomUUID().replaceAll('-', '')}@mailinator.com`,
    firstName: 'CUJ',
    lastName: 'Returning',
    password: 'Passw0rd!2026',
  });

export const customerRegistrationFor = (shopper: ReturningShopper): CustomerRegistrationRequest =>
  Object.freeze({
    customer: Object.freeze({
      email: shopper.email,
      firstName: shopper.firstName,
      lastName: shopper.lastName,
      login: shopper.email,
    }),
    password: shopper.password,
  });

export const basketItemFor = (basket: Basket, variant: OrderableVariant): BasketItemInput => ({
  basketId: required(basket.basketId, 'basket.basketId'),
  body: [{ productId: variant.variantId, quantity: 1 }],
});

export const customerAddressFor = (shopper: ReturningShopper): CustomerAddressRequest => ({
  address1: '1 Market Street',
  addressId: 'cuj4-one-click',
  city: 'San Francisco',
  countryCode: 'US',
  firstName: shopper.firstName,
  lastName: shopper.lastName,
  phone: '4155550123',
  postalCode: '94105',
  preferred: true,
  stateCode: 'CA',
});

export const customerPaymentInstrumentFor = (
  shopper: ReturningShopper,
): CustomerPaymentInstrumentRequest => ({
  default: true,
  paymentCard: {
    cardType: 'Visa',
    expirationMonth: 12,
    expirationYear: 2030,
    holder: `${shopper.firstName} ${shopper.lastName}`,
    issueNumber: '1',
    number: '4111111111111111',
    validFromMonth: 1,
    validFromYear: 2026,
  },
  paymentMethodId: 'CREDIT_CARD',
});

export const oneTimeCodeRequestFor = (email: string, usid: string): OneTimeCodeRequest => ({
  channel_id: env.SFCC_SITE_ID,
  locale: env.E2E_LOCALE.toLowerCase(),
  mode: 'email',
  user_id: email,
  usid,
});

export const oneTimeCodeVerificationFor = (
  email: string,
): OneTimeCodeVerificationRequest => ({
  client_id: env.SFCC_CLIENT_ID,
  grant_type: 'authorization_code',
  hint: 'pwdless_login',
  login_id: email,
  pwdless_login_token: required(env.E2E_ONE_CLICK_OTP, 'env.E2E_ONE_CLICK_OTP'),
});

export const defaultShipmentIdFrom = (basket: Basket): string =>
  required(basket.shipments?.[0]?.shipmentId, 'basket.shipments[0].shipmentId');

export const customerInfoFor = (customer: Customer): Readonly<{ email: string }> => ({
  email: required(customer.email, 'customer.email'),
});

export const savedAddressFrom = (customer: Customer): AddressRequest => {
  const address = required(
    customer.addresses?.find((candidate) => candidate.preferred) ?? customer.addresses?.[0],
    'customer.addresses[preferred|0]',
  );
  return {
    address1: required(address.address1, 'customer.addresses[].address1'),
    city: required(address.city, 'customer.addresses[].city'),
    countryCode: address.countryCode,
    firstName: required(address.firstName, 'customer.addresses[].firstName'),
    lastName: address.lastName,
    phone: required(address.phone, 'customer.addresses[].phone'),
    postalCode: required(address.postalCode, 'customer.addresses[].postalCode'),
    stateCode: required(address.stateCode, 'customer.addresses[].stateCode'),
  };
};

export const savedPaymentInstrumentFrom = (customer: Customer): SavedPaymentInstrument =>
  required(
    customer.paymentInstruments?.find((candidate) => candidate.default) ??
      customer.paymentInstruments?.[0],
    'customer.paymentInstruments[default|0]',
  );

export const shippingMethodIdFrom = (methods: ShippingMethodResult): string =>
  required(methods.applicableShippingMethods?.[0]?.id, 'applicableShippingMethods[0].id');

export const shippingMethodRequestFor = (id: string): ShippingMethodRequest => ({ id });

export const basketPaymentInstrumentFor = (
  basket: Basket,
  saved: SavedPaymentInstrument,
): BasketPaymentInstrumentRequest => {
  const card = required(saved.paymentCard, 'customer.paymentInstruments[].paymentCard');
  return {
    amount: required(basket.orderTotal, 'basket.orderTotal'),
    paymentCard: {
      cardType: required(card.cardType, 'saved paymentCard.cardType'),
      expirationMonth: required(card.expirationMonth, 'saved paymentCard.expirationMonth'),
      expirationYear: required(card.expirationYear, 'saved paymentCard.expirationYear'),
      holder: required(card.holder, 'saved paymentCard.holder'),
      maskedNumber: required(card.maskedNumber, 'saved paymentCard.maskedNumber'),
    },
    paymentMethodId: required(saved.paymentMethodId, 'saved paymentInstrument.paymentMethodId'),
  };
};

export const orderRequestFor = (basketId: string): OrderRequest => ({ basketId });

export const registeredLoginForm = (
  challenge: string,
  guestUsid: string,
): Readonly<Record<string, string>> => ({
  channel_id: env.SFCC_SITE_ID,
  client_id: env.SFCC_CLIENT_ID,
  code_challenge: challenge,
  redirect_uri: new URL('/callback', env.E2E_BASE_URL).toString(),
  response_type: 'code',
  usid: guestUsid,
});

export const tokenExchangeForm = (
  code: string,
  verifier: string,
  usid: string,
): Readonly<Record<string, string>> => ({
  channel_id: env.SFCC_SITE_ID,
  client_id: env.SFCC_CLIENT_ID,
  code,
  code_verifier: verifier,
  grant_type: 'authorization_code_pkce',
  redirect_uri: new URL('/callback', env.E2E_BASE_URL).toString(),
  usid,
});
