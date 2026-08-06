import type { APIRequestContext } from '@playwright/test';
import type { StoreVariant, UiOrderableVariant } from '../../../api/support/products';
import {
  findCategoryProductsInStore,
  findStoreOrderableVariant,
  findUiOrderableVariant,
} from '../../../api/support/products';
import { bearer, shopperApiUrl, withSite } from '../../../api/support/scapi';
import { getGuestToken, loginRegisteredShopper, requireSession } from '../../../api/support/slas';
import { findNearbyStore } from '../../../api/support/stores';

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

export interface ShopperCredentials {
  email: string;
  password: string;
}

/** What the product page needs clicked to reach one buyable variant. */
export interface SelectableVariant {
  masterId: string;
  colorName: string;
  /** Absent for products sold in a single size. */
  sizeName?: string;
}

export interface PickupStore {
  id: string;
  name: string;
  inventoryId: string;
  /** Label the store finder's country picker shows. */
  countryLabel: string;
  postalCode: string;
}

export interface PickupSelection {
  store: PickupStore;
  product: StoreVariant;
}

// Guest contact address. The shop rejects example.com emails.
export const shopperEmail = 'test.shopper@gmail.com';

export const password = 'Test1234!';

export const card: Card = {
  number: '4111111111111111',
  expiry: '12/30',
  securityCode: '123',
  holder: 'Test Shopper',
};

export const homeAddress: Address = {
  firstName: 'Test',
  lastName: 'Shopper',
  phone: '4155551234',
  address1: '415 Mission St',
  city: 'San Francisco',
  stateCode: 'CA',
  postalCode: '94105',
  countryCode: 'US',
};

// Second destination for the multi-shipment journey. A different recipient makes
// each shipment easy to tell apart on the confirmation.
export const secondAddress: Address = {
  firstName: 'Second',
  lastName: 'Recipient',
  phone: '6175551234',
  address1: '300 Mishawum Rd',
  city: 'Woburn',
  stateCode: 'MA',
  postalCode: '01801',
  countryCode: 'US',
};

// Two different products, so a basket can hold two lines that ship apart.
const deliveryMasterId = '25591139M';
const secondDeliveryMasterId = '25518484M';

// Woburn MA: several pickup stores in range, all sharing one store stock.
const storeArea = {
  countryCode: 'US',
  countryLabel: 'United States',
  postalCode: '01801',
  maxDistance: '100',
};

// Where the pickup product is looked for, and how many results the store-filtered
// product list returns on its first page.
const pickupCategoryId = 'newarrivals';
const pickupCategoryPageSize = 25;

// Address book entry the registered journey checks out with.
export const savedAddressId = 'home';

// Sizes are resolved at run time. The demo store's stock keeps moving.
export const deliveryVariant = async (request: APIRequestContext): Promise<UiOrderableVariant> => {
  const { accessToken } = await getGuestToken(request);
  return findUiOrderableVariant(request, accessToken, deliveryMasterId);
};

export const twoDeliveryVariants = async (
  request: APIRequestContext,
): Promise<[UiOrderableVariant, UiOrderableVariant]> => {
  const { accessToken } = await getGuestToken(request);
  const first = await findUiOrderableVariant(request, accessToken, deliveryMasterId);
  const second = await findUiOrderableVariant(request, accessToken, secondDeliveryMasterId);

  // One variant twice would merge into a single line and leave nothing to split.
  if (first.variantId === second.variantId) {
    throw new Error(
      `products ${deliveryMasterId} and ${secondDeliveryMasterId} both resolved to variant ` +
        `${first.variantId}; the demo store's stock has likely changed`,
    );
  }
  return [first, second];
};

// Three systems meet here:
// - Shopper Stores: which store is nearby.
// - Shopper Search: what that store stocks in the category, by its stock id.
// - Shopper Products: a variant actually on the shelf, against that same stock id.
export const pickupSelection = async (request: APIRequestContext): Promise<PickupSelection> => {
  const { accessToken } = await getGuestToken(request);
  const store = await findNearbyStore(request, accessToken, {
    countryCode: storeArea.countryCode,
    postalCode: storeArea.postalCode,
    maxDistance: storeArea.maxDistance,
  });
  const { masterIds } = await findCategoryProductsInStore(
    request,
    accessToken,
    pickupCategoryId,
    store.inventoryId,
    pickupCategoryPageSize,
  );
  const product = await findStoreOrderableVariant(
    request,
    accessToken,
    masterIds,
    store.inventoryId,
  );

  return {
    store: {
      ...store,
      countryLabel: storeArea.countryLabel,
      postalCode: storeArea.postalCode,
    },
    product,
  };
};

// New email every run so parallel tests never share a basket or order history.
export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

const createCustomer = async (
  request: APIRequestContext,
  guestToken: string,
  credentials: ShopperCredentials,
): Promise<void> => {
  const created = await request.post(shopperApiUrl('customer/shopper-customers/v1', 'customers'), {
    params: withSite(),
    headers: bearer(guestToken),
    data: {
      customer: {
        firstName: homeAddress.firstName,
        lastName: homeAddress.lastName,
        email: credentials.email,
        login: credentials.email,
      },
      password: credentials.password,
    },
  });
  if (!created.ok()) {
    throw new Error(
      `registering ${credentials.email} failed (${created.status()}): ${await created.text()}`,
    );
  }
};

const createSavedAddress = async (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
): Promise<void> => {
  const saved = await request.post(
    shopperApiUrl('customer/shopper-customers/v1', `customers/${customerId}/addresses`),
    {
      params: withSite(),
      headers: bearer(accessToken),
      // preferred, so checkout offers it as the default shipping address.
      data: { addressId: savedAddressId, ...homeAddress, preferred: true },
    },
  );
  if (!saved.ok()) {
    throw new Error(
      `saving the address book entry for ${customerId} failed (${saved.status()}): ${await saved.text()}`,
    );
  }
};

// Make the account and its saved address over the API so the browser only has to
// sign in and spend what the account already holds.
export const registeredShopper = async (
  request: APIRequestContext,
): Promise<ShopperCredentials> => {
  const credentials: ShopperCredentials = { email: uniqueEmail(), password };
  const { accessToken: guestToken } = await getGuestToken(request);
  await createCustomer(request, guestToken, credentials);

  const login = await loginRegisteredShopper(request, credentials.email, credentials.password);
  const { accessToken, customerId } = requireSession(login, credentials.email);
  await createSavedAddress(request, accessToken, customerId);

  return credentials;
};

const items = (count: number): string => (count === 1 ? 'item' : 'items');

export const cartHeading = (count: number): string => `Cart (${count} ${items(count)})`;

export const cartBadgeLabel = (count: number): string => `My cart, number of items: ${count}`;

// The cart groups its lines by how they are handed over. The plural is fixed.
export const deliveryGroupLabel = (inGroup: number, total: number): string =>
  `Delivery - ${inGroup} out of ${total} items`;

export const pickupGroupLabel = (inGroup: number, total: number): string =>
  `Pick Up in Store - ${inGroup} out of ${total} items`;

export const pickupOptionLabel = 'Pick Up in Store';

// Values the fulfillment picker holds for each hand-over.
export const deliveryFulfillment = 'delivery';
export const pickupFulfillment = 'pickup';

export const storeStockLabel = (storeName: string): string => `In stock at ${storeName}`;

// The shipping-method step names each shipment after who receives it.
export const shipmentLabel = (address: Address): string =>
  `Shipping to ${address.firstName} ${address.lastName}`;

export const contactStep = 'Contact Info';
export const pickupStep = 'Pickup Address & Information';
export const shippingAddressStep = 'Shipping Address';

export const pickupDetails = 'Pickup Details';
export const pickupAddress = 'Pickup Address';
export const deliveryDetails = 'Delivery Details';

// A confirmation numbers its groups only when an order has more than one.
export const deliveryGroupHeading = (position: number): string => `Delivery ${position}`;

export const orderNumberLabel = (orderNo: string): string => `Order Number: ${orderNo}`;

export const orderNumberFrom = (text: string): string => {
  const orderNo = /order number:\s*(\d+)/i.exec(text)?.[1];
  if (orderNo === undefined) {
    throw new Error(`the confirmation did not show an order number: ${text}`);
  }
  return orderNo;
};

// A placed order lands on the numbered confirmation route.
export const confirmationUrlPattern = /\/checkout\/confirmation\/\d+/;

export const accountUrlPattern = /\/account\/?$/;
