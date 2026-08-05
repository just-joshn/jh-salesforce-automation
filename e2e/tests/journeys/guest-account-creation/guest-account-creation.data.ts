import type { APIRequestContext, Request, Response } from '@playwright/test';
import type { UiOrderableVariant } from '../../../../api/support/products';
import { findUiOrderableVariant } from '../../../../api/support/products';
import { bearer, shopperApiUrl, withSite } from '../../../../api/support/scapi';
import {
  getGuestToken,
  loginRegisteredShopper,
  requireSession,
} from '../../../../api/support/slas';
import { readStorefrontAppConfig } from '../../../support/app-config';

const CUSTOMERS = 'customer/shopper-customers/v1';

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

/** Credentials the guest turns their finished purchase into an account with. */
export interface Registrant {
  email: string;
  password: string;
}

/**
 * Whether this storefront is configured for the journey. The confirmation page
 * renders its account form only when one-click checkout is off, so that flag
 * being off is the journey's condition rather than an incidental detail.
 */
export interface GuestAccountCondition {
  met: boolean;
  reason: string;
}

/** What the order itself says, which is what the account is derived from. */
export interface OrderIdentity {
  orderNo: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Delivery addresses on the order, before deduplication. */
  deliveryAddresses: Address[];
  /** How many of those remain once duplicates collapse. */
  uniqueAddressCount: number;
}

interface OrderAddressResource {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address1?: string;
  city?: string;
  stateCode?: string;
  postalCode?: string;
  countryCode?: string;
}

interface OrderShipmentResource {
  shippingAddress?: OrderAddressResource;
  /** Set on a shipment the shopper collects, which is never saved as an address. */
  c_fromStoreId?: string;
}

interface OrderResource {
  orderNo?: string;
  customerInfo?: { email?: string };
  billingAddress?: OrderAddressResource;
  shipments?: OrderShipmentResource[];
}

interface CustomerAddressResource extends OrderAddressResource {
  addressId?: string;
}

interface CustomerResource {
  addresses?: CustomerAddressResource[];
}

// Two different products, so the basket can hold two lines that ship separately.
const firstMasterId = '25591139M';
const secondMasterId = '25518484M';

// Meets the form's stated rules: 8 characters, upper, lower, number, special.
export const password = 'Test1234!';

export const card: Card = {
  number: '4111111111111111',
  expiry: '12/30',
  securityCode: '123',
  holder: 'Test Shopper',
};

/**
 * The one destination both lines are sent to. Two shipments carrying the same
 * address is what gives the confirmation's deduplication something to collapse.
 */
export const sharedAddress: Address = {
  firstName: 'Test',
  lastName: 'Shopper',
  phone: '4155551234',
  address1: '415 Mission St',
  city: 'San Francisco',
  stateCode: 'CA',
  postalCode: '94105',
  countryCode: 'US',
};

// --- The condition, proven before the browser starts ---

export const guestAccountCondition = async (
  request: APIRequestContext,
): Promise<GuestAccountCondition> => {
  const app = await readStorefrontAppConfig(request);
  const oneClickEnabled = app.oneClickCheckout?.enabled === true;
  return {
    met: !oneClickEnabled,
    reason: oneClickEnabled
      ? 'app.oneClickCheckout.enabled is true, so the confirmation page hands account creation ' +
        'to the one-click flow and never renders the post-checkout account form'
      : 'one-click checkout is disabled, so the confirmation page offers the account form',
  };
};

// New email every run: the form registers it, and a login already in use is
// refused.
export const uniqueEmail = (): string =>
  `qa.guestaccount.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

export const registrant = (): Registrant => ({ email: uniqueEmail(), password });

// Sizes are resolved at run time; the demo store's stock keeps moving.
export const twoDeliveryVariants = async (
  request: APIRequestContext,
): Promise<[UiOrderableVariant, UiOrderableVariant]> => {
  const { accessToken } = await getGuestToken(request);
  const first = await findUiOrderableVariant(request, accessToken, firstMasterId);
  const second = await findUiOrderableVariant(request, accessToken, secondMasterId);

  // One variant twice would merge into a single line and leave nothing to split.
  if (first.variantId === second.variantId) {
    throw new Error(
      `products ${firstMasterId} and ${secondMasterId} both resolved to variant ` +
        `${first.variantId}; the demo store's stock has likely changed`,
    );
  }
  return [first, second];
};

// --- What the order says, read from the storefront's own Shopper Orders call ---

const text = (value: string | undefined): string => value ?? '';

const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * The fields the confirmation page's deduplication compares. Phone is not among
 * them, so two shipments differing only by phone still count as one address.
 */
const COMPARED_FIELDS = [
  'address1',
  'city',
  'countryCode',
  'firstName',
  'lastName',
  'postalCode',
  'stateCode',
] as const;

/**
 * The same comparison the confirmation page deduplicates with: an address is a
 * repeat when name, street, city, state, postal code and country all match.
 */
const isSameAddress = (left: Address, right: Address): boolean =>
  COMPARED_FIELDS.every((field) => normalize(left[field]) === normalize(right[field]));

const toAddress = (resource: OrderAddressResource): Address => ({
  firstName: text(resource.firstName),
  lastName: text(resource.lastName),
  phone: text(resource.phone),
  address1: text(resource.address1),
  city: text(resource.city),
  stateCode: text(resource.stateCode),
  postalCode: text(resource.postalCode),
  countryCode: text(resource.countryCode),
});

/** Shipments a shopper collects hold no delivery address to save. */
const deliveryAddressesOf = (order: OrderResource): Address[] =>
  (order.shipments ?? []).flatMap((shipment) => {
    if (shipment.c_fromStoreId !== undefined) return [];
    if (shipment.shippingAddress === undefined) return [];
    return [toAddress(shipment.shippingAddress)];
  });

const countUniqueAddresses = (addresses: Address[]): number => {
  const unique: Address[] = [];
  for (const address of addresses) {
    if (!unique.some((kept) => isSameAddress(kept, address))) unique.push(address);
  }
  return unique.length;
};

/**
 * What the confirmation page derives the account from, taken from the very
 * Shopper Orders response it read. Reading the same payload the page read is what
 * makes "the form is filled from the order" a claim about the order rather than
 * about values this test happened to type earlier.
 */
const shopperOn = (
  order: OrderResource,
): { email: string; firstName: string; lastName: string } => ({
  email: text(order.customerInfo?.email),
  firstName: text(order.billingAddress?.firstName),
  lastName: text(order.billingAddress?.lastName),
});

export const orderIdentityFrom = async (response: Response): Promise<OrderIdentity> => {
  const order = (await response.json()) as OrderResource;
  const { orderNo } = order;
  if (orderNo === undefined) {
    throw new Error(`Shopper Orders returned no order number: ${await response.text()}`);
  }
  const deliveryAddresses = deliveryAddressesOf(order);
  return {
    orderNo,
    ...shopperOn(order),
    deliveryAddresses,
    uniqueAddressCount: countUniqueAddresses(deliveryAddresses),
  };
};

// --- What the new account holds afterwards, read back over the commerce API ---

/**
 * The address book of the customer the form created, read through a session of
 * its own. Signing in with the new credentials proves SLAS accepted them, and the
 * address book proves what Shopper Customers stored.
 */
export const savedAddressesFor = async (
  request: APIRequestContext,
  who: Registrant,
): Promise<Address[]> => {
  const login = await loginRegisteredShopper(request, who.email, who.password);
  const { accessToken, customerId } = requireSession(login, who.email);

  const response = await request.get(shopperApiUrl(CUSTOMERS, `customers/${customerId}`), {
    params: withSite(),
    headers: bearer(accessToken),
  });
  if (!response.ok()) {
    throw new Error(
      `reading the new customer ${customerId} failed (${response.status()}): ${await response.text()}`,
    );
  }

  const customer = (await response.json()) as CustomerResource;
  return (customer.addresses ?? []).map(toAddress);
};

export const hasAddress = (addresses: Address[], wanted: Address): boolean =>
  addresses.some((candidate) => isSameAddress(candidate, wanted));

// --- Reading the storefront's own traffic, to place each step on a service ---

const pathOf = (request: Request): string => new URL(request.url()).pathname;

const singleOrderPath = /\/orders\/[^/]+$/;

/**
 * Shopper Orders, carrying the order the confirmation page derives the account
 * from. The page reads that order through the same query the create call seeds,
 * so it issues no separate read of its own on a freshly placed order; whichever
 * of the two carries the order resource is therefore the one taken.
 */
export const orderResourceResponse = (response: Response): boolean => {
  const path = new URL(response.url()).pathname;
  if (!path.includes('/checkout/shopper-orders/v1/')) return false;
  if (response.request().method() === 'POST') return path.endsWith('/orders');
  return response.request().method() === 'GET' && singleOrderPath.exec(path) !== null;
};

/** Shopper Customers: the write that registers the customer. */
export const registerCall = (request: Request): boolean =>
  request.method() === 'POST' &&
  pathOf(request).includes(`/${CUSTOMERS}/`) &&
  pathOf(request).endsWith('/customers');

/** Shopper Customers: one write per address that survived deduplication. */
export const addressWriteCall = (request: Request): boolean =>
  request.method() === 'POST' &&
  pathOf(request).includes(`/${CUSTOMERS}/`) &&
  pathOf(request).endsWith('/addresses');

// --- Wording and routes the confirmation and account pages render ---

export const createAccountHeading = 'Create an account for faster checkout';
export const thankYouHeading = 'Thank you for your order!';

export const cartBadgeLabel = (count: number): string => `My cart, number of items: ${count}`;

export const deliveryGroupLabel = (inGroup: number, total: number): string =>
  `Delivery - ${inGroup} out of ${total} items`;

export const accountUrlPattern = /\/account\/?$/;
export const confirmationUrlPattern = /\/checkout\/confirmation\/\d+/;
