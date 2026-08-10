import { randomUUID } from 'node:crypto';

import type { OrderableVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type {
  Basket,
  Order,
  OrderPaymentInstrument,
  ShippingMethodResult,
} from '../../support/scapi-types';

export interface ShopperConfiguration {
  readonly id: string;
  readonly value: unknown;
}

export interface ShopperConfigurationsResponse {
  readonly configurations: readonly ShopperConfiguration[];
}

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

export interface BasketPaymentInstrumentRequest {
  readonly amount: number;
  readonly paymentMethodId: string;
}

export interface OrderPaymentInstrumentRequest extends BasketPaymentInstrumentRequest {
  readonly paymentReferenceRequest: {
    readonly paymentMethodType: string;
  };
}

export interface OrderRequest {
  readonly basketId: string;
}

export interface BasketInput<TBody> {
  readonly basketId: string;
  readonly body: TBody;
}

export interface ShipmentInput<TBody> extends BasketInput<TBody> {
  readonly shipmentId: string;
}

export interface OrderPaymentInput {
  readonly body: OrderPaymentInstrumentRequest;
  readonly orderNo: string;
  readonly paymentInstrumentId: string;
}

export interface CheckoutInput {
  readonly customer: CustomerRequest;
  readonly productItems: readonly ProductItemRequest[];
  readonly shippingAddress: AddressRequest;
}

interface PaymentMethod {
  readonly id: string;
}

export interface PaymentMethodResult {
  readonly applicablePaymentMethods?: readonly PaymentMethod[];
}

export const expected = Object.freeze({
  basketMutationStatus: 200,
  orderNumberPattern: /^\d{8}$/,
  orderStatus: 'new',
  paymentMethodId: 'Salesforce Payments',
  paymentMethodType: 'card',
  salesforcePaymentsAllowedId: 'SalesforcePaymentsAllowed',
  successStatus: 200,
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

export const createCheckoutInput = (variant: OrderableVariant): CheckoutInput =>
  Object.freeze({
    customer: Object.freeze({
      email: `cuj2-api-${Date.now()}-${randomUUID().replaceAll('-', '')}@mailinator.com`,
    }),
    productItems: Object.freeze([{ productId: variant.variantId, quantity: 1 }]),
    shippingAddress,
  });

export const basketIdFrom = (basket: Basket): string =>
  required(basket.basketId, 'basket.basketId');

export const defaultShipmentIdFrom = (basket: Basket): string =>
  required(basket.shipments?.[0]?.shipmentId, 'basket.shipments[0].shipmentId');

export const shippingMethodIdFrom = (methods: ShippingMethodResult): string =>
  required(methods.defaultShippingMethodId, 'shippingMethods.defaultShippingMethodId');

export const salesforcePaymentsMethodIdFrom = (methods: PaymentMethodResult): string =>
  required(
    methods.applicablePaymentMethods?.find(({ id }) => id === expected.paymentMethodId)?.id,
    'paymentMethods.Salesforce Payments.id',
  );

export const shippingMethodRequestFor = (id: string): ShippingMethodRequest => ({ id });

export const basketPaymentInstrumentFor = (
  basket: Basket,
  paymentMethodId: string,
): BasketPaymentInstrumentRequest => ({
  amount: required(basket.orderTotal, 'basket.orderTotal'),
  paymentMethodId,
});

export const orderRequestFor = (basketId: string): OrderRequest => ({ basketId });

export const orderNoFrom = (order: Order): string => required(order.orderNo, 'order.orderNo');

export const paymentInstrumentFrom = (
  order: Order,
  paymentMethodId: string,
): OrderPaymentInstrument =>
  required(
    order.paymentInstruments?.find((instrument) => instrument.paymentMethodId === paymentMethodId),
    `order payment instrument ${paymentMethodId}`,
  );

export const paymentInstrumentIdFrom = (order: Order, paymentMethodId: string): string =>
  required(
    paymentInstrumentFrom(order, paymentMethodId).paymentInstrumentId,
    'order.paymentInstruments[].paymentInstrumentId',
  );

export const orderPaymentInstrumentFor = (
  order: Order,
  paymentMethodId: string,
): OrderPaymentInstrumentRequest => ({
  amount: required(order.orderTotal, 'order.orderTotal'),
  paymentMethodId,
  paymentReferenceRequest: { paymentMethodType: expected.paymentMethodType },
});

export const isEnabled = (value: unknown): boolean => value === true || value === 'true';
