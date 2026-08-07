import type { APIRequestContext } from '@playwright/test';
import { readOmsActivation } from '../../support/oms';
import type { OrderableVariant } from '../../support/products';
import { findOrderableVariants } from '../../support/products';
import { required } from '../../support/scapi';
import type { Order, OrderShipment } from '../../support/scapi-types';

export interface ShopperCredentials {
  email: string;
  password: string;
}
export interface OrderAddress {
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  city: string;
  stateCode: string;
  postalCode: string;
  countryCode: string;
}
export interface EcomFallbackCondition {
  met: boolean;
  reason: string;
}

const deliveryMasterId = '25591139M';
export const deliveryMethodId = 'GBP001';
export const paymentMethodId = 'CREDIT_CARD';
export const password = 'Test1234!';
export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;
export const credentials = (): ShopperCredentials => ({ email: uniqueEmail(), password });
export const orderAddress: OrderAddress = {
  firstName: 'Test',
  lastName: 'Portfolio',
  phone: '4155551234',
  address1: '415 Mission St',
  city: 'San Francisco',
  stateCode: 'CA',
  postalCode: '94105',
  countryCode: 'US',
};
export const card = {
  cardType: 'Visa',
  expirationMonth: 12,
  expirationYear: 2030,
  holder: 'Test Portfolio',
  securityCode: '123',
};

export const ecomFallbackCondition = async (
  request: APIRequestContext,
): Promise<EcomFallbackCondition> => {
  const activation = await readOmsActivation(request);
  return {
    met: !activation.active,
    reason: activation.active
      ? 'Order Management is active for this site, so freshly placed orders can carry omsData and no ECOM-only order exists here to assert the fallback against'
      : `Order Management reports: ${activation.reason}`,
  };
};

export const orderableVariant = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<OrderableVariant> => {
  const [variant] = await findOrderableVariants(request, accessToken, {
    masterId: deliveryMasterId,
    minCount: 1,
  });
  return required(variant, 'orderable variant');
};
export const itemsWithOmsState = (order: Order): number =>
  (order.productItems ?? []).filter((item) => item.omsData !== undefined).length;
export const firstShipment = (order: Order): OrderShipment =>
  required(order.shipments?.[0], 'order shipment');
export const carrierTrackingUrls = (order: Order): string[] =>
  (order.omsData?.shipments ?? []).flatMap((shipment) =>
    shipment.trackingUrl === undefined ? [] : [shipment.trackingUrl],
  );
export const orderProductName = (order: Order): string | undefined =>
  order.productItems?.[0]?.productName;
export const omsShipments = (order: Order) => order.omsData?.shipments;
export const fulfillmentName = (order: Order): string | undefined =>
  firstShipment(order).shippingMethod?.name;
