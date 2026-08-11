import { composeOmsSkipReason } from '../../support/gates';
import type { OmsAvailability, SeededOmsOrderNumber } from '../../support/oms';
import type { OmsShipment, Order } from '../../support/scapi-types';

export const carrierTrackingProtocol = 'https:' as const;
export const omsOrderExpansions = 'oms,oms_shipments';

export interface TrackingAction {
  readonly carrierUrl: string;
  readonly rawCarrierUrl: string;
  readonly shipmentId: string | undefined;
}

export type TrackingJourneyGate =
  | { readonly kind: 'ready'; readonly orderNo: string }
  | { readonly kind: 'skip'; readonly reason: string };

export const externalCarrierUrl = (rawUrl: string): string | undefined => {
  try {
    const url = new URL(rawUrl);
    return url.protocol === carrierTrackingProtocol ? url.toString() : undefined;
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
  return carrierUrl === undefined
    ? undefined
    : { carrierUrl, rawCarrierUrl: shipment.trackingUrl, shipmentId: shipment.id };
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

export const composeTrackingSkipReason = (
  availability: OmsAvailability,
  order: SeededOmsOrderNumber,
): string => composeOmsSkipReason(availability, order);

export const trackingJourneyGate = (
  availability: OmsAvailability,
  order: SeededOmsOrderNumber,
): TrackingJourneyGate => {
  if (availability.kind === 'active' && order.kind === 'configured') {
    return { kind: 'ready', orderNo: order.orderNo };
  }

  return { kind: 'skip', reason: composeTrackingSkipReason(availability, order) };
};
