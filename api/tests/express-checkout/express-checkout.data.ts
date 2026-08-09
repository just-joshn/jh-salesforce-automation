import { randomUUID } from 'node:crypto';

import type { OrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type {
  Basket,
  BasketShipment,
  Order,
  ShippingMethodResult,
} from '../../support/scapi-types';

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
  readonly body: { readonly id: string };
  readonly shipmentId: string;
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

export interface BasketPaymentInput {
  readonly basketId: string;
  readonly body: PaymentInstrumentRequest;
}

export interface OrderRequest {
  readonly basketId: string;
}

export interface CheckoutInput {
  readonly customer: CustomerRequest;
  readonly productItems: readonly ProductItemRequest[];
  readonly shippingAddress: AddressRequest;
}

export interface PreparedBasket {
  readonly basket: Basket;
  readonly basketId: string;
}

export const expected = Object.freeze({
  basketMutationStatus: 200,
  createOrderStatus: 200,
  orderNumberPattern: /^\d{8}$/,
  orderReadStatus: 200,
  orderStatus: 'new',
  paymentMethodId: 'CREDIT_CARD',
});
export const emptyBasketRequest = Object.freeze({});

const shippingAddress: AddressRequest = Object.freeze({
  address1: '1 Market Street',
  city: 'San Francisco',
  countryCode: 'US',
  firstName: 'CUJ',
  lastName: 'Express',
  phone: '4155550123',
  postalCode: '94105',
  stateCode: 'CA',
});

export const createCheckoutInput = (variant: OrderableVariant): CheckoutInput =>
  Object.freeze({
    customer: Object.freeze({
      email: `cuj3-${Date.now()}-${randomUUID().replaceAll('-', '')}@mailinator.com`,
    }),
    productItems: Object.freeze([{ productId: variant.variantId, quantity: 1 }]),
    shippingAddress,
  });

export const basketIdFrom = (basket: Basket): string =>
  required(basket.basketId, 'basket.basketId');

export const shipmentIdFrom = (basket: Basket): string =>
  required(basket.shipments?.[0]?.shipmentId, 'basket.shipments[0].shipmentId');

export const shippingAddressFrom = (basket: Basket): BasketShipment['shippingAddress'] =>
  basket.shipments?.[0]?.shippingAddress;

export const selectedShippingMethodIdFrom = (basket: Basket): string | undefined =>
  basket.shipments?.[0]?.shippingMethod?.id;

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

export const paymentInstrumentFor = (basket: Basket): PaymentInstrumentRequest => ({
  amount: required(basket.orderTotal, 'basket.orderTotal'),
  paymentCard: {
    cardType: 'Visa',
    expirationMonth: 12,
    expirationYear: 2030,
    holder: 'CUJ Express',
    maskedNumber: '************1111',
  },
  paymentMethodId: expected.paymentMethodId,
});

export const orderRequestFor = (basketId: string): OrderRequest => ({ basketId });

export const orderNumberFrom = (order: Order): string => required(order.orderNo, 'order.orderNo');
