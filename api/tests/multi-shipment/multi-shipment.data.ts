import { randomUUID } from 'node:crypto';

import type { OrderableVariant } from '../../support/products';
import { MINIMUM_AVAILABLE_TO_SELL } from '../../support/products';
import { required } from '../../support/scapi';
import type {
  Basket,
  BasketShipment,
  Product,
  ProductInventory,
  ShippingMethodResult,
} from '../../support/scapi-types';

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

export interface ProductItemRequest {
  readonly productId: string;
  readonly quantity: number;
  readonly shipmentId: string;
}

export interface ShipmentRequest {
  readonly shipmentId: string;
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

export interface BasketInput<TBody> {
  readonly basketId: string;
  readonly body: TBody;
}

export interface ShipmentInput<TBody> extends BasketInput<TBody> {
  readonly shipmentId: string;
}

export interface OrderRequest {
  readonly basketId: string;
}

export const expected = Object.freeze({
  mutationStatus: 200,
  orderNumberPattern: /^\d{8}$/,
  orderStatus: 'new',
  paymentMethodId: 'CREDIT_CARD',
  shipmentCount: 2,
});

export const emptyBasketRequest = Object.freeze({});

export const destinationAddresses: readonly [AddressRequest, AddressRequest] = Object.freeze([
  Object.freeze({
    address1: '1 Market Street',
    city: 'San Francisco',
    countryCode: 'US',
    firstName: 'Avery',
    lastName: 'North',
    phone: '4155550101',
    postalCode: '94105',
    stateCode: 'CA',
  }),
  Object.freeze({
    address1: '350 Fifth Avenue',
    city: 'New York',
    countryCode: 'US',
    firstName: 'Blake',
    lastName: 'East',
    phone: '2125550102',
    postalCode: '10001',
    stateCode: 'NY',
  }),
]);

export const customerRequest = (): Readonly<{ email: string }> =>
  Object.freeze({
    email: `cuj7-api-${Date.now()}-${randomUUID().replaceAll('-', '')}@mailinator.com`,
  });

export const secondShipmentRequest = (): ShipmentRequest => ({
  shipmentId: `cuj7-${randomUUID()}`,
});

export const productItemRequest = (
  product: OrderableVariant,
  shipmentId: string,
): readonly ProductItemRequest[] =>
  Object.freeze([{ productId: product.variantId, quantity: 1, shipmentId }]);

export const basketIdFrom = (basket: Basket): string =>
  required(basket.basketId, 'basket.basketId');

export const defaultShipmentIdFrom = (basket: Basket): string =>
  required(basket.shipments?.[0]?.shipmentId, 'basket.shipments[0].shipmentId');

export const defaultShippingMethodIdFrom = (methods: ShippingMethodResult): string =>
  required(methods.defaultShippingMethodId, 'shippingMethods.defaultShippingMethodId');

export const shippingMethodRequestFor = (id: string): ShippingMethodRequest => ({ id });

export const paymentInstrumentFor = (basket: Basket): PaymentInstrumentRequest => ({
  amount: required(basket.orderTotal, 'basket.orderTotal'),
  paymentCard: {
    cardType: 'Visa',
    expirationMonth: 12,
    expirationYear: 2030,
    holder: 'Multi Shipment Shopper',
    maskedNumber: '************1111',
  },
  paymentMethodId: expected.paymentMethodId,
});

export const orderRequestFor = (basketId: string): OrderRequest => ({ basketId });

const availableToSell = (inventory: ProductInventory | undefined): number | undefined => {
  if (!inventory?.orderable) {
    return undefined;
  }
  const ats = inventory.ats;
  if (ats === undefined) {
    return undefined;
  }
  return ats >= MINIMUM_AVAILABLE_TO_SELL ? ats : undefined;
};

export const orderableVariantFrom = (
  master: Product,
  stockedProduct: Product,
  variantId: string,
): OrderableVariant | undefined => {
  const ats = availableToSell(stockedProduct.inventory);
  if (ats === undefined) {
    return undefined;
  }

  return {
    availableToSell: ats,
    productId: required(master.id, 'product.id'),
    productName: required(master.name, 'product.name'),
    variantId,
  };
};

export const shipmentFrom = (basket: Basket, shipmentId: string): BasketShipment =>
  required(
    basket.shipments?.find((shipment) => shipment.shipmentId === shipmentId),
    `basket shipment ${shipmentId}`,
  );

export const shippingMethodIsApplicable = (
  shipment: BasketShipment,
  methods: ShippingMethodResult,
): boolean => {
  const selectedId = shipment.shippingMethod?.id;
  if (selectedId === undefined) {
    return true;
  }
  return (methods.applicableShippingMethods ?? []).some((method) => method.id === selectedId);
};
