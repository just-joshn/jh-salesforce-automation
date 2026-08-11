import type { PickupStore } from '../../../api/support/stores';

export interface StoreSelection {
  readonly countryCode: string;
  readonly id: string;
  readonly name: string;
  readonly postalCode: string;
}

export interface JourneyProduct {
  readonly productId: string;
  readonly productName: string;
  readonly variantId: string;
}

export interface CheckoutData {
  readonly address: string;
  readonly cardNumber: string;
  readonly cardholder: string;
  readonly city: string;
  readonly email: string;
  readonly expirationDate: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
  readonly postalCode: string;
  readonly securityCode: string;
  readonly state: string;
}

const requireStoreField = (value: string | undefined, field: string): string => {
  if (!value) {
    throw new Error(`Pickup store is missing ${field}`);
  }

  return value;
};

export const toStoreSelection = ({ store }: PickupStore): StoreSelection =>
  Object.freeze({
    countryCode: requireStoreField(store.countryCode, 'countryCode'),
    id: store.id,
    name: requireStoreField(store.name, 'name'),
    postalCode: requireStoreField(store.postalCode, 'postalCode'),
  });

export const pickupProductPath = (product: JourneyProduct): string =>
  `/product/${encodeURIComponent(product.productId)}?pid=${encodeURIComponent(product.variantId)}`;

export const unavailableProductPath = (productId: string): string =>
  `/product/${encodeURIComponent(productId)}`;

const acceptedCardNumber = '4111111111111111';

export const maskedCardSuffix = `•••• ${acceptedCardNumber.slice(-4)}`;

export const createCheckoutData = (): CheckoutData =>
  Object.freeze({
    address: '1 Market Street',
    cardNumber: acceptedCardNumber,
    cardholder: 'BOPIS Shopper',
    city: 'San Francisco',
    email: `cuj6-${Date.now()}-${crypto.randomUUID()}@mailinator.com`,
    expirationDate: '12/30',
    firstName: 'BOPIS',
    lastName: 'Shopper',
    phone: '4155550100',
    postalCode: '94105',
    securityCode: '123',
    state: 'California',
  });

export const orderNumberFromConfirmation = (confirmation: string | null): string => {
  const match = confirmation?.match(/^Order Number: (\d+)$/);
  const orderNumber = match?.[1];
  if (!orderNumber) {
    throw new Error(`Unexpected order confirmation text: ${confirmation ?? 'null'}`);
  }

  return orderNumber;
};
