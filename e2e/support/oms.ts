import type { APIRequestContext } from '@playwright/test';
import { bearer, shopperApiUrl, withSite } from '../../api/support/scapi';
import { getGuestToken, loginRegisteredShopper } from '../../api/support/slas';
import { env } from '../../config/env';

// Salesforce Order Management, which is what decides whether the three OMS order
// journeys exist on a given deployment at all.
//
// The storefront ships no flag for them. Every one of Track Shipment, Cancel
// Order and Return Items is gated purely on OMS state being attached to the
// order, so the only thing that turns them on is a connected Order Management
// org enriching the order — see the storefront's own note: "There is no feature
// flag. Each action is gated entirely on data and shopper identity... B2C
// Commerce-only orders (no omsData) never expose the return or cancel flows."
//
// So the condition is read from the commerce service itself rather than inferred
// from what renders: Shopper Orders answers the OMS metadata resource with
// oms-not-active on a site Order Management is not connected to.

const ORDERS = 'checkout/shopper-orders/v1';

/** Both expansions the order detail page asks an order for. */
export const orderExpand = 'oms, oms_shipments';

export interface ShopperCredentials {
  email: string;
  password: string;
}

/** A reason the shop offers for cancelling an order or returning an item. */
export interface OmsReasonCode {
  reason: string;
  default?: boolean;
}

interface OmsMetaDataResource {
  returnReasonCodes?: OmsReasonCode[];
  cancelReasonCodes?: OmsReasonCode[];
}

/** One OMS shipment, as Shopper Orders returns it under `expand=oms_shipments`. */
export interface OmsShipment {
  id?: string;
  status?: string;
  provider?: string;
  trackingNumber?: string;
  /** Raw carrier URL, which the order detail page sanitizes before exposing. */
  trackingUrl?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
}

/** OMS state attached to one order line. */
export interface OmsItemData {
  status?: string;
  quantityOrdered?: number;
  quantityAvailableToCancel?: number;
  quantityAvailableToReturn?: number;
}

/** OMS state attached to the order itself. */
export interface OmsOrderData {
  status?: string;
  shipments?: OmsShipment[];
}

export interface OrderItemResource {
  itemId?: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  omsData?: OmsItemData;
}

interface EcomShipmentResource {
  shippingMethod?: { name?: string };
  shippingStatus?: string;
}

export interface OrderResource {
  orderNo?: string;
  /** ECOM order state, which the page falls back to without OMS state. */
  status?: string;
  currency?: string;
  orderTotal?: number;
  shippingStatus?: string;
  customerInfo?: { customerId?: string; email?: string };
  productItems?: OrderItemResource[];
  shipments?: EcomShipmentResource[];
  /** Present only on an order Order Management has ingested. */
  omsData?: OmsOrderData;
}

/** Whether Order Management is connected to the site under test. */
export interface OmsActivation {
  active: boolean;
  /** Why OMS is or is not active here, for the skip annotation. */
  reason: string;
  returnReasonCodes: OmsReasonCode[];
  cancelReasonCodes: OmsReasonCode[];
}

/**
 * Names the exact settings that are not met, so a skip is a statement about the
 * deployment rather than a shrug.
 */
const notActiveReason =
  'Shopper Orders answered oms-not-active for this site, so Order Management is not connected: ' +
  'the journey needs a Salesforce Order Management org linked to this B2C Commerce instance, ' +
  'Administration > Global Preferences > Salesforce Order Management Integration Administration ' +
  'set to Active, and Merchant Tools > Site Preferences > Order > Order Management Settings > ' +
  'Include in Order Management set to Yes';

const metaDataUrl = (): string => shopperApiUrl(ORDERS, 'orders/oms-meta-data');

const inactive = (): OmsActivation => ({
  active: false,
  reason: notActiveReason,
  returnReasonCodes: [],
  cancelReasonCodes: [],
});

const activeFrom = (meta: OmsMetaDataResource): OmsActivation => ({
  active: true,
  reason: 'Order Management is active for this site',
  returnReasonCodes: meta.returnReasonCodes ?? [],
  cancelReasonCodes: meta.cancelReasonCodes ?? [],
});

/**
 * Whether Order Management is active, read from the OMS metadata resource the
 * order detail page itself reads its return reasons from.
 *
 * A shop that answers neither "here are the reason codes" nor "OMS is not
 * active" is a store fault, not a journey whose condition is unmet, so it is
 * raised rather than folded into an inactive result: a broken shop must never
 * read as "this journey does not apply here".
 */
export async function readOmsActivation(request: APIRequestContext): Promise<OmsActivation> {
  const { accessToken } = await getGuestToken(request);
  const response = await request.get(metaDataUrl(), {
    params: withSite(),
    headers: bearer(accessToken),
  });
  if (response.ok()) return activeFrom((await response.json()) as OmsMetaDataResource);

  const body = await response.text();
  if (response.status() === 409 && body.includes('oms-not-active')) return inactive();
  throw new Error(
    `${metaDataUrl()} answered ${response.status()}: ${body}; whether Order Management is ` +
      'active for this site could not be established',
  );
}

/** An order read back as the shopper who owns it, or why it could not be. */
export type OrderLookup =
  | { found: true; order: OrderResource; accessToken: string; customerId: string }
  | { found: false; reason: string };

const noSession = (email: string): OrderLookup => ({
  found: false,
  reason: `the configured shopper ${email} could not be signed in, so the seeded OMS order could not be read`,
});

/**
 * One order, read exactly the way the order detail page reads it — as its owner,
 * with both OMS expansions — so what the test expects traces back to the payload
 * the page rendered from.
 */
export async function readOwnedOrder(
  request: APIRequestContext,
  credentials: ShopperCredentials,
  orderNo: string,
): Promise<OrderLookup> {
  const login = await loginRegisteredShopper(request, credentials.email, credentials.password);
  if (!login.accessToken || !login.customerId) return noSession(credentials.email);

  const response = await request.get(shopperApiUrl(ORDERS, `orders/${orderNo}`), {
    params: withSite({ locale: env.locale, expand: orderExpand }),
    headers: bearer(login.accessToken),
  });
  if (response.ok()) {
    return {
      found: true,
      order: (await response.json()) as OrderResource,
      accessToken: login.accessToken,
      customerId: login.customerId,
    };
  }
  return {
    found: false,
    reason: `order ${orderNo} could not be read as ${credentials.email} (${response.status()})`,
  };
}

/** Whether the shopper who owns the seeded orders is configured. */
export const configuredShopper = (): ShopperCredentials => ({
  email: env.account.email,
  password: env.account.password,
});

export const credentialsReason =
  'E2E_ACCOUNT_EMAIL / E2E_ACCOUNT_PASSWORD are empty, so no registered shopper owns an order';

const credentialsMissing = (credentials: ShopperCredentials): boolean =>
  credentials.email === '' || credentials.password === '';

/** Everything the three OMS journeys need in common before a browser is worth starting. */
export type OmsPreflight =
  | { ready: true; credentials: ShopperCredentials; orderNo: string; activation: OmsActivation }
  | { ready: false; reason: string };

export async function omsPreflight(
  request: APIRequestContext,
  orderNo: string,
  seedReason: string,
): Promise<OmsPreflight> {
  const credentials = configuredShopper();
  if (credentialsMissing(credentials)) return { ready: false, reason: credentialsReason };
  if (orderNo === '') return { ready: false, reason: seedReason };

  const activation = await readOmsActivation(request);
  if (!activation.active) return { ready: false, reason: activation.reason };
  return { ready: true, credentials, orderNo, activation };
}
