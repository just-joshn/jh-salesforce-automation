import { randomUUID } from 'node:crypto';

import type { OrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type { Basket, ShippingMethodResult } from '../../support/scapi-types';

export interface ProductItemRequest {
  readonly productId: string;
  readonly quantity: number;
}

export interface CustomerRequest {
  readonly email: string;
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

export interface ShippingMethodRequest {
  readonly id: string;
}

export interface PaymentInstrumentRequest {
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

export interface OrderRequest {
  readonly basketId: string;
}

export interface BasketItemInput {
  readonly basketId: string;
  readonly body: readonly ProductItemRequest[];
}

export interface BasketCustomerInput {
  readonly basketId: string;
  readonly body: CustomerRequest;
}

export interface ShipmentAddressInput {
  readonly basketId: string;
  readonly body: AddressRequest;
  readonly shipmentId: string;
}

export interface ShipmentMethodInput {
  readonly basketId: string;
  readonly body: ShippingMethodRequest;
  readonly shipmentId: string;
}

export interface BasketPaymentInput {
  readonly basketId: string;
  readonly body: PaymentInstrumentRequest;
}

export interface CheckoutInput {
  readonly customer: CustomerRequest;
  readonly invalidAddress: AddressRequest;
  readonly productItems: readonly ProductItemRequest[];
  readonly shippingAddress: AddressRequest;
}

export const expected = Object.freeze({
  basketMutationStatus: 200,
  createOrderStatus: 200,
  duplicateOrderStatus: 404,
  faultField: 'countryCode',
  invalidAddressStatus: 400,
  orderNumberPattern: /^\d{8}$/,
  orderStatus: 'new',
  paymentMethodId: 'CREDIT_CARD',
});

export const emptyBasketRequest = Object.freeze({});

const shippingAddress: AddressRequest = Object.freeze({
  address1: '1 Market Street',
  city: 'San Francisco',
  countryCode: 'US',
  firstName: 'CUJ',
  lastName: 'Shopper',
  phone: '4155550123',
  postalCode: '94105',
  stateCode: 'CA',
});

const invalidAddress: AddressRequest = Object.freeze({
  ...shippingAddress,
  countryCode: 'USA',
});

export const createCheckoutInput = (variant: OrderableVariant): CheckoutInput =>
  Object.freeze({
    customer: Object.freeze({
      email: `cuj1-api-${Date.now()}-${randomUUID().replaceAll('-', '')}@mailinator.com`,
    }),
    invalidAddress,
    productItems: Object.freeze([{ productId: variant.variantId, quantity: 1 }]),
    shippingAddress,
  });

export const basketIdFrom = (basket: Basket): string => required(basket.basketId, 'basket.basketId');

export const defaultShipmentIdFrom = (basket: Basket): string =>
  required(basket.shipments?.[0]?.shipmentId, 'basket.shipments[0].shipmentId');

export const shippingMethodIdFrom = (result: ShippingMethodResult): string =>
  required(result.defaultShippingMethodId, 'shippingMethods.defaultShippingMethodId');

export const paymentInstrumentFor = (basket: Basket): PaymentInstrumentRequest => ({
  amount: required(basket.orderTotal, 'basket.orderTotal'),
  paymentCard: {
    cardType: 'Visa',
    expirationMonth: 12,
    expirationYear: 2030,
    holder: 'CUJ Shopper',
    maskedNumber: '************1111',
  },
  paymentMethodId: expected.paymentMethodId,
});

export const shippingMethodRequestFor = (id: string): ShippingMethodRequest => ({ id });

export const orderRequestFor = (basketId: string): OrderRequest => ({ basketId });
