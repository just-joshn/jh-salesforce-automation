import type { APIRequestContext, Request } from '@playwright/test';
import { env } from '../../../config/env';
import type { OmsShipment, OrderResource, ShopperCredentials } from '../../../api/support/oms';
import { configuredShopper, omsPreflight, readOwnedOrder } from '../../../api/support/oms';

// CUJ 21 — Track shipment through carrier.
//
// The order detail page does not link a raw OMS tracking URL. It runs every
// `omsData.shipments[].trackingUrl` through the same hardening its tracking-number
// links use, and drops the shipments whose URL does not survive. A scheme-less
// host is upgraded to https. Anything relative or unsafe is discarded, so the
// shopper is never sent inside the app by a link claiming to be a carrier.
//
// `carrierUrl` below reimplements that documented contract independently. It does
// not call into the storefront. That way the expected set of tracking actions is
// derived from the order payload itself. Otherwise the test could only assert
// that the page agrees with itself.

const ORDERS = 'checkout/shopper-orders/v1';

/** Hostnames ending in a file extension are documents, not carrier hosts. */
const fileSuffix =
  /\.(html?|php|aspx?|jsp|css|js|mjs|cjs|json|xml|txt|pdf|png|jpe?g|gif|svg|webp|ico)$/i;

const isControl = (character: string): boolean => {
  const code = character.codePointAt(0) ?? 0;
  return code <= 0x1f || code === 0x7f;
};

/** Control characters are stripped before parsing, so they cannot smuggle a scheme past it. */
const stripControl = (raw: string): string =>
  [...raw].filter((character) => !isControl(character)).join('');

const hostIsPlausible = (hostname: string): boolean =>
  hostname.includes('.') &&
  hostname.split('.').every((part) => part.length > 0) &&
  fileSuffix.exec(hostname) === null;

const hasHttpScheme = (url: URL): boolean => url.protocol === 'http:' || url.protocol === 'https:';

const hasNoCredentials = (url: URL): boolean => url.username === '' && url.password === '';

const isExternalisable = (url: URL): boolean =>
  hasHttpScheme(url) && hasNoCredentials(url) && hostIsPlausible(url.hostname);

const externalised = (url: URL): string | undefined =>
  isExternalisable(url) ? url.toString() : undefined;

const rejectedOutright = (raw: string): boolean =>
  raw.includes('\\') || raw.startsWith('.') || (raw.startsWith('/') && !raw.startsWith('//'));

const parsed = (candidate: string): URL | undefined => {
  try {
    return new URL(candidate);
  } catch {
    return undefined;
  }
};

/** A scheme carrying a dot is a host that was mistaken for a scheme, e.g. `ups.com:80/x`. */
const schemeLooksLikeHost = (url: URL): boolean => url.protocol.replace(/:$/, '').includes('.');

const withHttps = (raw: string): string =>
  raw.startsWith('//') ? `https:${raw}` : `https://${raw}`;

const upgradedUrl = (cleaned: string): string | undefined => {
  const upgraded = parsed(withHttps(cleaned));
  return upgraded === undefined ? undefined : externalised(upgraded);
};

const directUrl = (direct: URL, cleaned: string): string | undefined => {
  if (!schemeLooksLikeHost(direct)) return externalised(direct);
  if (direct.host !== '') return undefined;
  return upgradedUrl(cleaned);
};

const cleanedUrl = (cleaned: string): string | undefined => {
  const direct = parsed(cleaned);
  return direct === undefined ? upgradedUrl(cleaned) : directUrl(direct, cleaned);
};

/** The carrier URL a shipment may be tracked at, or nothing if it must not be exposed. */
export const carrierUrl = (raw: string | undefined): string | undefined => {
  if (typeof raw !== 'string' || rejectedOutright(raw)) return undefined;
  const cleaned = stripControl(raw).trim();
  return cleaned === '' ? undefined : cleanedUrl(cleaned);
};

/** A shipment the page is expected to offer a tracking action for. */
export interface TrackableShipment {
  trackingNumber?: string;
  /** Position among all OMS shipments, which names an untracked-number option. */
  index: number;
  url: string;
}

export interface TrackShipmentCondition {
  met: boolean;
  /** Why the journey does or does not exist here, for the skip annotation. */
  reason: string;
  orderNo: string;
  credentials: ShopperCredentials;
  trackable: TrackableShipment[];
  /** Raw carrier URLs sanitizing rejected, which must never reach the page. */
  withheldUrls: string[];
}

const unmet = (reason: string): TrackShipmentCondition => ({
  met: false,
  reason,
  orderNo: '',
  credentials: configuredShopper(),
  trackable: [],
  withheldUrls: [],
});

/** The shipment the journey tracks, which the met condition guarantees exists. */
export const intendedShipment = (condition: TrackShipmentCondition): TrackableShipment => {
  const [first] = condition.trackable;
  if (first === undefined) throw new Error('the met condition guaranteed a trackable shipment');
  return first;
};

const trackableFrom = (shipments: OmsShipment[]): TrackableShipment[] =>
  shipments.flatMap((shipment, index) => {
    const url = carrierUrl(shipment.trackingUrl);
    return url === undefined ? [] : [{ trackingNumber: shipment.trackingNumber, index, url }];
  });

const withheldFrom = (shipments: OmsShipment[]): string[] =>
  shipments.flatMap((shipment) => {
    const raw = shipment.trackingUrl ?? '';
    return raw !== '' && carrierUrl(raw) === undefined ? [raw] : [];
  });

const fromOrder = (
  order: OrderResource,
  orderNo: string,
  credentials: ShopperCredentials,
): TrackShipmentCondition => {
  if (order.omsData === undefined) {
    return unmet(
      `order ${orderNo} carries no omsData, so Order Management has not ingested it and the ` +
        'order detail page exposes no tracking action for it',
    );
  }
  const shipments = order.omsData.shipments ?? [];
  const trackable = trackableFrom(shipments);
  if (trackable.length === 0) {
    return unmet(
      `order ${orderNo} holds ${shipments.length} OMS shipment(s) but none carries a carrier URL ` +
        'that survives sanitizing, so there is no carrier page to open',
    );
  }
  return {
    met: true,
    reason: 'Order Management is active and the seeded order has a trackable shipment',
    orderNo,
    credentials,
    trackable,
    withheldUrls: withheldFrom(shipments),
  };
};

const seedReason =
  'E2E_OMS_TRACKING_ORDER_NO is empty. This journey needs an order whose OMS shipment already ' +
  'carries a carrier tracking URL, which only exists once the order is fulfilled — OMS ingestion ' +
  'is not retroactive and cannot advance an order on demand, so the order is seeded, not placed here';

/**
 * Whether this storefront can run the journey, proven against the commerce
 * services before the browser starts. Order Management has to be connected to the
 * site, and the seeded order has to hold a trackable shipment.
 */
export const trackShipmentCondition = async (
  request: APIRequestContext,
): Promise<TrackShipmentCondition> => {
  const pre = await omsPreflight(request, env.oms.trackingOrderNo, seedReason);
  if (!pre.ready) return unmet(pre.reason);

  const lookup = await readOwnedOrder(request, pre.credentials, pre.orderNo);
  return lookup.found
    ? fromOrder(lookup.order, pre.orderNo, pre.credentials)
    : unmet(lookup.reason);
};

export const orderActionsHeading = 'Order Actions';
export const orderDetailTitle = 'Order Details';
export const trackShipmentLabel = 'Track Shipment';

export const orderNumberLabel = (orderNo: string): string => `Order Number: ${orderNo}`;

/** A shipment with a tracking number is offered by that number. */
export const trackNumberLabel = (trackingNumber: string): string => `Track ${trackingNumber}`;

/** A shipment without one is offered by its position instead. */
export const trackIndexLabel = (index: number): string => `Track Shipment ${index + 1}`;

export const optionLabel = (shipment: TrackableShipment): string =>
  shipment.trackingNumber === undefined
    ? trackIndexLabel(shipment.index)
    : trackNumberLabel(shipment.trackingNumber);

export const orderDetailUrlPattern = (orderNo: string): RegExp =>
  new RegExp(`/account/orders/${orderNo}$`);

export const orderHistoryUrlPattern = /\/account\/orders$/;
export const accountUrlPattern = /\/account\/?$/;

const pathOf = (request: Request): string => new URL(request.url()).pathname;

/** Shopper Orders: the order read with its OMS shipments. */
export const orderDetailCall =
  (orderNo: string) =>
  (request: Request): boolean =>
    request.method() === 'GET' &&
    pathOf(request).includes(`/${ORDERS}/`) &&
    pathOf(request).endsWith(`/orders/${orderNo}`);

export const expandValues = (request: Request): string[] =>
  (new URL(request.url()).searchParams.get('expand') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
