import type { APIRequestContext } from '@playwright/test';
import { env } from '../../../config/env';
import type { OmsShipment, OrderResource, ShopperCredentials } from '../../support/oms';
import { configuredShopper, omsPreflight, readOwnedOrder } from '../../support/oms';

const fileSuffix =
  /\.(html?|php|aspx?|jsp|css|js|mjs|cjs|json|xml|txt|pdf|png|jpe?g|gif|svg|webp|ico)$/i;

const isControl = (character: string): boolean => {
  const code = character.codePointAt(0) ?? 0;
  return code <= 0x1f || code === 0x7f;
};

const stripControl = (raw: string): string =>
  [...raw].filter((character) => !isControl(character)).join('');

const hostIsPlausible = (hostname: string): boolean =>
  hostname.includes('.') &&
  hostname.split('.').every((part) => part.length > 0) &&
  fileSuffix.exec(hostname) === null;

const isExternalisable = (url: URL): boolean =>
  (url.protocol === 'http:' || url.protocol === 'https:') &&
  url.username === '' &&
  url.password === '' &&
  hostIsPlausible(url.hostname);

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

const schemeLooksLikeHost = (url: URL): boolean => url.protocol.replace(/:$/, '').includes('.');

const upgradedUrl = (cleaned: string): string | undefined => {
  const candidate = cleaned.startsWith('//') ? `https:${cleaned}` : `https://${cleaned}`;
  const upgraded = parsed(candidate);
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

/** Independently mirrors storefront carrier-URL hardening; never calls storefront code. */
export const carrierUrl = (raw: string | undefined): string | undefined => {
  if (typeof raw !== 'string' || rejectedOutright(raw)) return undefined;
  const cleaned = stripControl(raw).trim();
  return cleaned === '' ? undefined : cleanedUrl(cleaned);
};

export interface TrackableShipment {
  trackingNumber?: string;
  index: number;
  url: string;
}

export interface ShipmentAnalysis {
  trackable: TrackableShipment[];
  withheldUrls: string[];
}

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

export const shipmentAnalysis = (order: OrderResource): ShipmentAnalysis => {
  const shipments = order.omsData?.shipments ?? [];
  return { trackable: trackableFrom(shipments), withheldUrls: withheldFrom(shipments) };
};

export const trackingNumbersMatchPayload = (
  order: OrderResource,
  trackable: TrackableShipment[],
): boolean => {
  const shipments = order.omsData?.shipments ?? [];
  return trackable.every(
    (shipment) => shipment.trackingNumber === shipments[shipment.index]?.trackingNumber,
  );
};

export const intendedCarrierUrl = (
  order: OrderResource,
  intended: TrackableShipment,
): string | undefined => carrierUrl(order.omsData?.shipments?.[intended.index]?.trackingUrl);

export const intendedShipment = (shipments: TrackableShipment[]): TrackableShipment => {
  const [first] = shipments;
  if (first === undefined) throw new Error('the met condition guaranteed a trackable shipment');
  return first;
};

export interface TrackShipmentCondition {
  met: boolean;
  reason: string;
  orderNo: string;
  credentials: ShopperCredentials;
  accessToken: string;
}

const unmet = (reason: string): TrackShipmentCondition => ({
  met: false,
  reason,
  orderNo: '',
  credentials: configuredShopper(),
  accessToken: '',
});

const fromOrder = (
  order: OrderResource,
  orderNo: string,
  credentials: ShopperCredentials,
  accessToken: string,
): TrackShipmentCondition => {
  if (order.omsData === undefined) {
    return unmet(
      `order ${orderNo} carries no omsData, so Order Management has not ingested it and the ` +
        'order detail page exposes no tracking action for it',
    );
  }
  const shipments = order.omsData.shipments ?? [];
  if (trackableFrom(shipments).length === 0) {
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
    accessToken,
  };
};

const seedReason =
  'E2E_OMS_TRACKING_ORDER_NO is empty. This journey needs an order whose OMS shipment already ' +
  'carries a carrier tracking URL, which only exists once the order is fulfilled — OMS ingestion ' +
  'is not retroactive and cannot advance an order on demand, so the order is seeded, not placed here';

export const trackShipmentCondition = async (
  request: APIRequestContext,
): Promise<TrackShipmentCondition> => {
  const pre = await omsPreflight(request, env.oms.trackingOrderNo, seedReason);
  if (!pre.ready) return unmet(pre.reason);
  const lookup = await readOwnedOrder(request, pre.credentials, pre.orderNo);
  return lookup.found
    ? fromOrder(lookup.order, pre.orderNo, pre.credentials, lookup.accessToken)
    : unmet(lookup.reason);
};
