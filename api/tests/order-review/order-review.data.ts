import type { APIRequestContext } from '@playwright/test';
import {
  findCategoryProductsInStore,
  findOrderableVariants,
  findStoreOrderableVariant,
} from '../../support/products';
import type { OrderableVariant } from '../../support/products';
import { customString, required } from '../../support/scapi';
import type {
  CustomerOrder,
  CustomerOrderResult,
  Order,
  OrderProductItem,
  OrderShipment,
  ProductResult,
  Store,
  StoreResult,
} from '../../support/scapi-types';
import { findNearbyStore } from '../../support/stores';

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

export interface Card {
  cardType: string;
  expirationMonth: number;
  expirationYear: number;
  holder: string;
  securityCode: string;
}

export interface OrderPlan {
  productId: string;
  shippingMethodId: string;
  inventoryId?: string;
  fromStoreId?: string;
}

export const password = 'Test1234!';
export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

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

export const card: Card = {
  cardType: 'Visa',
  expirationMonth: 12,
  expirationYear: 2030,
  holder: 'Test Portfolio',
  securityCode: '123',
};

export const deliveryMethodId = 'GBP001';
export const pickupMethodId = 'GBP005';
export const paymentMethodId = 'CREDIT_CARD';
export const historyPageSize = '10';
export const historyFirstPageOffset = '0';
export const unknownOrderNo = 'BOGUS00000';

const deliveryMasterId = '25591139M';
const storeArea = { countryCode: 'US', postalCode: '01801', maxDistance: '100' };
const pickupCategoryId = 'newarrivals';
const pickupCategoryPageSize = 25;

export const credentials = (): ShopperCredentials => ({ email: uniqueEmail(), password });

export const deliveryVariant = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<OrderableVariant> => {
  const [variant] = await findOrderableVariants(request, accessToken, {
    masterId: deliveryMasterId,
    minCount: 1,
  });
  return required(variant, 'delivery orderable variant');
};

export const pickupPlan = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<{ plan: OrderPlan; storeId: string }> => {
  const store = await findNearbyStore(request, accessToken, storeArea);
  const { masterIds } = await findCategoryProductsInStore(
    request,
    accessToken,
    pickupCategoryId,
    store.inventoryId,
    pickupCategoryPageSize,
  );
  const variant = await findStoreOrderableVariant(
    request,
    accessToken,
    masterIds,
    store.inventoryId,
  );
  return {
    plan: {
      productId: variant.variantId,
      shippingMethodId: pickupMethodId,
      inventoryId: store.inventoryId,
      fromStoreId: store.id,
    },
    storeId: store.id,
  };
};

export const ordersOf = (history: CustomerOrderResult): CustomerOrder[] => history.data ?? [];
export const historyOrder = (history: CustomerOrderResult, orderNo: string): CustomerOrder => {
  const order = ordersOf(history).find((candidate) => candidate.orderNo === orderNo);
  return required(order, `history order ${orderNo}`);
};
export const orderItems = (order: Order): OrderProductItem[] => order.productItems ?? [];
export const firstItem = (order: Order): OrderProductItem =>
  required(orderItems(order)[0], 'order product item');
export const firstShipment = (order: Order): OrderShipment =>
  required(order.shipments?.[0], 'order shipment');
export const pickupStoreId = (order: Order): string | undefined =>
  customString(firstShipment(order).c_fromStoreId);
export const productsOf = (result: ProductResult) => result.data ?? [];
export const productIds = (result: ProductResult): string[] =>
  productsOf(result).flatMap((product) => (product.id === undefined ? [] : [product.id]));
export const storeFrom = (result: StoreResult, storeId: string): Store =>
  required(
    (result.data ?? []).find((store) => store.id === storeId),
    `store ${storeId}`,
  );
export const itemCount = (order: CustomerOrder): number => (order.productItems ?? []).length;
export const recipient = (order: CustomerOrder): string =>
  required(order.shipments?.[0]?.shippingAddress?.fullName, 'history recipient');
export const hasOmsState = (order: Order): boolean =>
  order.omsData !== undefined || orderItems(order).some((item) => item.omsData !== undefined);
export const orderItemCount = (order: Order): number => orderItems(order).length;
export const paymentMethod = (order: Order): string | undefined =>
  order.paymentInstruments?.[0]?.paymentMethodId;
export const shippingAddressOf = (order: Order) => firstShipment(order).shippingAddress;
export const shippingMethodName = (order: Order): string | undefined =>
  firstShipment(order).shippingMethod?.name;
export const shipmentStatus = (order: Order): string | undefined =>
  firstShipment(order).shippingStatus;
