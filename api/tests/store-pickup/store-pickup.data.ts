import { randomUUID } from 'node:crypto';

import type { OrderableVariant } from '../../support/products';
import { MINIMUM_AVAILABLE_TO_SELL } from '../../support/products';
import { required } from '../../support/scapi';
import type {
  Basket,
  Product,
  ProductInventory,
  ShippingMethodResult,
  Store,
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
  readonly inventoryId: string;
  readonly productId: string;
  readonly quantity: number;
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
  pickupMethodName: 'Store Pickup',
});

export const emptyBasketRequest = Object.freeze({});

const billingAddress: AddressRequest = Object.freeze({
  address1: '1 Market Street',
  city: 'San Francisco',
  countryCode: 'US',
  firstName: 'BOPIS',
  lastName: 'Shopper',
  phone: '4155550100',
  postalCode: '94105',
  stateCode: 'CA',
});

export const customerRequest = (): Readonly<{ email: string }> =>
  Object.freeze({
    email: `cuj6-api-${Date.now()}-${randomUUID().replaceAll('-', '')}@mailinator.com`,
  });

export const billingAddressRequest = (): AddressRequest => billingAddress;

export const pickupAddressFor = (store: Store): AddressRequest =>
  Object.freeze({
    address1: required(store.address1, 'store.address1'),
    city: required(store.city, 'store.city'),
    countryCode: required(store.countryCode, 'store.countryCode'),
    firstName: 'BOPIS',
    lastName: 'Shopper',
    phone: required(store.phone, 'store.phone'),
    postalCode: required(store.postalCode, 'store.postalCode'),
    stateCode: required(store.stateCode, 'store.stateCode'),
  });

export const pickupItemRequest = (
  product: OrderableVariant,
  inventoryId: string,
  shipmentId: string,
): readonly ProductItemRequest[] =>
  Object.freeze([{ inventoryId, productId: product.variantId, quantity: 1, shipmentId }]);

export const basketIdFrom = (basket: Basket): string =>
  required(basket.basketId, 'basket.basketId');

export const defaultShipmentIdFrom = (basket: Basket): string =>
  required(basket.shipments?.[0]?.shipmentId, 'basket.shipments[0].shipmentId');

export const pickupMethodIdFrom = (methods: ShippingMethodResult): string => {
  const method = methods.applicableShippingMethods?.find(
    (candidate) => candidate.name === expected.pickupMethodName,
  );
  return required(method?.id, 'pickup shipping method id');
};

export const paymentInstrumentFor = (basket: Basket): PaymentInstrumentRequest => ({
  amount: required(basket.orderTotal, 'basket.orderTotal'),
  paymentCard: {
    cardType: 'Visa',
    expirationMonth: 12,
    expirationYear: 2030,
    holder: 'BOPIS Shopper',
    maskedNumber: '************1111',
  },
  paymentMethodId: expected.paymentMethodId,
});

export const shippingMethodRequestFor = (id: string): ShippingMethodRequest => ({ id });

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

export const storeVariantFrom = (
  master: Product,
  stockedProduct: Product,
  variantId: string,
): OrderableVariant | undefined => {
  const ats = availableToSell(stockedProduct.inventories?.[0]);
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
