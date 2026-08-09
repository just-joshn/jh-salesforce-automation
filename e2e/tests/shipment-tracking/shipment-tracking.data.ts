import { randomUUID } from 'node:crypto';

import type { OmsAvailability, SeededOmsOrderNumber } from '../../../api/support/oms';
import type { Order, OmsShipment } from '../../../api/support/scapi-types';

export interface ShippingAddress {
  readonly address: string;
  readonly city: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
  readonly state: string;
  readonly zipCode: string;
}

export interface PaymentCard {
  readonly expirationDate: string;
  readonly nameOnCard: string;
  readonly number: string;
  readonly securityCode: string;
}

export interface CheckoutInput {
  readonly email: string;
  readonly password: string;
  readonly payment: PaymentCard;
  readonly shippingAddress: ShippingAddress;
}

export interface TrackingAction {
  readonly accessibleName: string;
  readonly href: string;
  readonly rawUrl: string;
}

export type TrackingNavigation =
  | { readonly kind: 'single'; readonly accessibleName: 'Track Shipment'; readonly href: string }
  | { readonly kind: 'multiple'; readonly accessibleName: string; readonly href: string };

export type TrackingJourneyGate =
  | { readonly kind: 'ready'; readonly orderNo: string }
  | { readonly kind: 'skip'; readonly reason: string };

export const shopperAccessTokenKeyPrefix = 'access_token_' as const;

const shippingAddress: ShippingAddress = Object.freeze({
  address: '1 Market Street',
  city: 'San Francisco',
  firstName: 'CUJ',
  lastName: 'Tracking',
  phone: '4155550123',
  state: 'CA',
  zipCode: '94105',
});

const acceptedTestCard: PaymentCard = Object.freeze({
  expirationDate: '12/30',
  nameOnCard: 'CUJ Tracking',
  number: '4111111111111111',
  securityCode: '123',
});

export const createCheckoutInput = (): CheckoutInput =>
  Object.freeze({
    email: `cuj15-${Date.now()}-${randomUUID()}@mailinator.com`,
    password: 'Passw0rd!2026',
    payment: acceptedTestCard,
    shippingAddress,
  });

export const extractOrderNumber = (confirmationText: string): string =>
  confirmationText.replace('Order Number: ', '');

export const externalCarrierUrl = (rawUrl: string): string | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (error) {
    if (error instanceof TypeError) {
      return undefined;
    }
    throw error;
  }

  return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    ? parsed.toString()
    : undefined;
};

const shipmentTrackingAction = (
  shipment: OmsShipment,
  index: number,
): TrackingAction | undefined => {
  const rawUrl = shipment.trackingUrl;
  if (!rawUrl) {
    return undefined;
  }
  const href = externalCarrierUrl(rawUrl);
  if (!href) {
    return undefined;
  }
  const accessibleName = shipment.trackingNumber
    ? `Track ${shipment.trackingNumber}`
    : `Track Shipment ${index + 1}`;
  return { accessibleName, href, rawUrl };
};

const omsShipments = (order: Order): readonly OmsShipment[] => order.omsData?.shipments ?? [];

export const expectedTrackingActions = (order: Order): readonly TrackingAction[] => {
  const actions: TrackingAction[] = [];
  omsShipments(order).forEach((shipment, index) => {
    const action = shipmentTrackingAction(shipment, index);
    if (action) {
      actions.push(action);
    }
  });
  return actions;
};

export const rejectedTrackingUrls = (order: Order): readonly string[] =>
  omsShipments(order)
    .map((shipment) => shipment.trackingUrl)
    .filter(
      (url): url is string => typeof url === 'string' && externalCarrierUrl(url) === undefined,
    );

export const trackingNavigation = (
  actions: readonly TrackingAction[],
): TrackingNavigation | undefined => {
  const [first] = actions;
  if (!first) {
    return undefined;
  }
  return actions.length === 1
    ? { kind: 'single', accessibleName: 'Track Shipment', href: first.href }
    : { kind: 'multiple', accessibleName: first.accessibleName, href: first.href };
};

const availabilityReason = (availability: OmsAvailability): string | undefined =>
  availability.kind === 'gated' ? availability.reason : undefined;

const seededOrderReason = (seededOrder: SeededOmsOrderNumber): string | undefined =>
  seededOrder.kind === 'not-configured' ? seededOrder.reason : undefined;

export const composeTrackingSkipReason = (
  availability: OmsAvailability,
  seededOrder: SeededOmsOrderNumber,
): string =>
  [availabilityReason(availability), seededOrderReason(seededOrder)].filter(Boolean).join(' ');

export const trackingJourneyGate = (
  availability: OmsAvailability,
  seededOrder: SeededOmsOrderNumber,
): TrackingJourneyGate => {
  if (availability.kind === 'active' && seededOrder.kind === 'configured') {
    return { kind: 'ready', orderNo: seededOrder.orderNo };
  }
  return { kind: 'skip', reason: composeTrackingSkipReason(availability, seededOrder) };
};

export const carriesNoOmsData = (order: Order): boolean =>
  order.omsData === undefined &&
  (order.productItems ?? []).every((item) => item.omsData === undefined);

const shipmentStatusLabel = (status: string): string => {
  switch (status) {
    case 'not_shipped':
      return 'Not shipped';
    case 'shipped':
      return 'Shipped';
    default:
      return status;
  }
};

export const ecomShipmentStatusLabels = (order: Order): readonly string[] =>
  (order.shipments ?? [])
    .map((shipment) => shipment.shippingStatus)
    .filter((status) => status !== undefined)
    .map(shipmentStatusLabel);
