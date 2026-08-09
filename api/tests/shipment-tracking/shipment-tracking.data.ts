import type { OmsAvailability, SeededOmsOrderNumber } from '../../support/oms';
import type { OmsShipment, Order } from '../../support/scapi-types';

export interface TrackingAction {
  readonly carrierUrl: string;
  readonly shipmentId: string | undefined;
}

export type TrackingJourneyGate =
  | { readonly kind: 'ready'; readonly orderNo: string }
  | { readonly kind: 'skip'; readonly reason: string };

export const externalCarrierUrl = (rawUrl: string): string | undefined => {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch (error) {
    if (error instanceof TypeError) {
      return undefined;
    }
    throw error;
  }
};

const trackingAction = (shipment: OmsShipment): TrackingAction | undefined => {
  if (!shipment.trackingUrl) {
    return undefined;
  }

  const carrierUrl = externalCarrierUrl(shipment.trackingUrl);
  return carrierUrl === undefined ? undefined : { carrierUrl, shipmentId: shipment.id };
};

const omsShipments = (order: Order): readonly OmsShipment[] => order.omsData?.shipments ?? [];

export const expectedTrackingActions = (order: Order): readonly TrackingAction[] =>
  omsShipments(order)
    .map(trackingAction)
    .filter((action): action is TrackingAction => action !== undefined);

export const rejectedTrackingUrls = (order: Order): readonly string[] =>
  omsShipments(order)
    .map((shipment) => shipment.trackingUrl)
    .filter(
      (url): url is string => typeof url === 'string' && externalCarrierUrl(url) === undefined,
    );

const availabilityReason = (availability: OmsAvailability): string | undefined => {
  switch (availability.kind) {
    case 'active':
      return undefined;
    case 'gated':
      return availability.reason;
  }
};

const seededOrderReason = (order: SeededOmsOrderNumber): string | undefined => {
  switch (order.kind) {
    case 'configured':
      return undefined;
    case 'not-configured':
      return order.reason;
  }
};

export const composeTrackingSkipReason = (
  availability: OmsAvailability,
  order: SeededOmsOrderNumber,
): string => [availabilityReason(availability), seededOrderReason(order)].filter(Boolean).join(' ');

export const trackingJourneyGate = (
  availability: OmsAvailability,
  order: SeededOmsOrderNumber,
): TrackingJourneyGate => {
  if (availability.kind === 'active' && order.kind === 'configured') {
    return { kind: 'ready', orderNo: order.orderNo };
  }

  return { kind: 'skip', reason: composeTrackingSkipReason(availability, order) };
};
