import { customString, required } from '../../support/scapi';
import type {
  Basket,
  BasketProductItem,
  BasketShipment,
  Customer,
  CustomerOrder,
  CustomerOrderResult,
  Order,
  OrderProductItem,
  OrderShipment,
} from '../../support/scapi-types';
import {
  card,
  deliveryVariant,
  homeAddress,
  password,
  pickupSelection,
  savedAddressId,
  secondAddress,
  shopperEmail,
  twoDeliveryVariants,
  uniqueEmail,
} from '../../../e2e/tests/purchase-fulfillment/purchase-fulfillment.data';
import type {
  Address,
  Card,
  PickupSelection,
  ShopperCredentials,
} from '../../../e2e/tests/purchase-fulfillment/purchase-fulfillment.data';

export type { Address, Card, PickupSelection, ShopperCredentials };
export {
  card,
  deliveryVariant,
  homeAddress,
  pickupSelection,
  savedAddressId,
  secondAddress,
  shopperEmail,
  twoDeliveryVariants,
};

export interface PaymentCard {
  cardType: string;
  expirationMonth: number;
  expirationYear: number;
  holder: string;
  securityCode: string;
}

export interface AddItemOptions {
  inventoryId?: string;
  shipmentId?: string;
}

export type SavedAddress = NonNullable<Customer['addresses']>[number];

export const deliveryShipmentId = 'me';
export const pickupShipmentId = 'pickup';
export const secondDeliveryShipmentId = 'second-delivery';
export const deliveryMethodId = 'GBP001';
export const pickupMethodId = 'GBP005';
export const paymentMethodId = 'CREDIT_CARD';
export const singleQuantity = 1;
export const shippedLineQuantity = 2;

// A freshly placed order is `new` on the demo. Sites that hold an order before
// processing can return `created`; both are placed states in Shopper Orders.
export const placedStatuses: Order['status'][] = ['new', 'created'];

export const newShopperCredentials = (): ShopperCredentials => ({
  email: uniqueEmail(),
  password,
});

export const registrationRequest = (credentials: ShopperCredentials) => ({
  customer: {
    firstName: homeAddress.firstName,
    lastName: homeAddress.lastName,
    email: credentials.email,
    login: credentials.email,
  },
  password: credentials.password,
});

export const savedAddressRequest = () => ({
  addressId: savedAddressId,
  ...homeAddress,
  preferred: true,
});

export const basketItemsRequest = (
  productId: string,
  quantity: number,
  options: AddItemOptions = {},
) => [{ productId, quantity, ...options }];

export const basketCustomerRequest = (email: string) => ({ email });

export const shipmentRequest = (shipmentId: string) => ({ shipmentId });

export const moveItemRequest = (shipmentId: string, quantity: number) => ({
  shipmentId,
  quantity,
});

export const shippingMethodRequest = (methodId: string) => ({ id: methodId });

export const pickupShipmentRequest = (storeId: string) => ({
  shippingMethod: { id: pickupMethodId },
  c_fromStoreId: storeId,
});

export const paymentCardFrom = (source: Card): PaymentCard => {
  const [monthText, yearText] = source.expiry.split('/');
  const expirationMonth = Number(monthText);
  const expirationYear = 2000 + Number(yearText);
  if (!Number.isInteger(expirationMonth) || !Number.isInteger(expirationYear)) {
    throw new Error(`card expiry ${source.expiry} is not MM/YY`);
  }
  return {
    cardType: 'Visa',
    expirationMonth,
    expirationYear,
    holder: source.holder,
    securityCode: source.securityCode,
  };
};

export const paymentRequest = (source: Card, amount: number) => ({
  paymentMethodId,
  paymentCard: paymentCardFrom(source),
  amount,
});

export const orderRequest = (basketId: string) => ({ basketId });

export const basketItems = (basket: Basket): BasketProductItem[] => basket.productItems ?? [];

export const basketShipments = (basket: Basket): BasketShipment[] => basket.shipments ?? [];

export const basketLineFor = (basket: Basket, productId: string): BasketProductItem => {
  const line = basketItems(basket).find((item) => item.productId === productId);
  return required(line, `basket product ${productId}`);
};

export const basketShipmentById = (basket: Basket, shipmentId: string): BasketShipment => {
  const shipment = basketShipments(basket).find((entry) => entry.shipmentId === shipmentId);
  return required(shipment, `basket shipment ${shipmentId}`);
};

export const basketLinesOnShipment = (basket: Basket, shipmentId: string): BasketProductItem[] =>
  basketItems(basket).filter((item) => item.shipmentId === shipmentId);

export const basketStoreId = (shipment: BasketShipment): string | undefined =>
  customString(shipment.c_fromStoreId);

export const basketTotal = (basket: Basket): number => required(basket.orderTotal, 'orderTotal');

export const basketCustomerEmail = (basket: Basket): string =>
  required(basket.customerInfo, 'customerInfo').email;

export const basketCustomerId = (basket: Basket): string =>
  required(required(basket.customerInfo, 'customerInfo').customerId, 'customerInfo.customerId');

export const basketShippingAddress = (
  basket: Basket,
  shipmentId: string,
): NonNullable<BasketShipment['shippingAddress']> =>
  required(basketShipmentById(basket, shipmentId).shippingAddress, 'shipment.shippingAddress');

export const basketShippingMethodId = (basket: Basket, shipmentId: string): string =>
  required(basketShipmentById(basket, shipmentId).shippingMethod, 'shipment.shippingMethod').id;

export const basketBillingAddress = (basket: Basket): NonNullable<Basket['billingAddress']> =>
  required(basket.billingAddress, 'billingAddress');

export const savedAddressFrom = (customer: Customer): SavedAddress => {
  const address = (customer.addresses ?? []).find((entry) => entry.addressId === savedAddressId);
  return required(address, `saved address ${savedAddressId}`);
};

export const shippingAddressFrom = (saved: SavedAddress): Address => ({
  firstName: required(saved.firstName, 'saved address firstName'),
  lastName: saved.lastName,
  phone: required(saved.phone, 'saved address phone'),
  address1: required(saved.address1, 'saved address address1'),
  city: required(saved.city, 'saved address city'),
  stateCode: required(saved.stateCode, 'saved address stateCode'),
  postalCode: required(saved.postalCode, 'saved address postalCode'),
  countryCode: saved.countryCode,
});

export const orderItems = (order: Order): OrderProductItem[] => order.productItems ?? [];

export const orderShipments = (order: Order): OrderShipment[] => order.shipments ?? [];

export const orderShipmentById = (order: Order, shipmentId: string): OrderShipment => {
  const shipment = orderShipments(order).find((entry) => entry.shipmentId === shipmentId);
  return required(shipment, `order shipment ${shipmentId}`);
};

export const orderLinesOnShipment = (order: Order, shipmentId: string): OrderProductItem[] =>
  orderItems(order).filter((item) => item.shipmentId === shipmentId);

export const orderStoreId = (shipment: OrderShipment): string | undefined =>
  customString(shipment.c_fromStoreId);

export const orderNumber = (order: Order): string => required(order.orderNo, 'orderNo');

export const orderCustomerId = (order: Order): string =>
  required(required(order.customerInfo, 'customerInfo').customerId, 'customerInfo.customerId');

export const orderCustomerEmail = (order: Order): string =>
  required(order.customerInfo, 'customerInfo').email;

export const orderShippingAddress = (
  order: Order,
  shipmentId: string,
): NonNullable<OrderShipment['shippingAddress']> =>
  required(orderShipmentById(order, shipmentId).shippingAddress, 'shipment.shippingAddress');

export const orderShippingMethodId = (order: Order, shipmentId: string): string =>
  required(orderShipmentById(order, shipmentId).shippingMethod, 'shipment.shippingMethod').id;

export const firstOrderLineOnShipment = (order: Order, shipmentId: string): OrderProductItem =>
  required(orderLinesOnShipment(order, shipmentId)[0], 'shipment product');

export const historyOrders = (result: CustomerOrderResult): CustomerOrder[] => result.data ?? [];

export const historyOrderByNumber = (
  result: CustomerOrderResult,
  placedOrderNo: string,
): CustomerOrder => {
  const order = historyOrders(result).find((entry) => entry.orderNo === placedOrderNo);
  return required(order, `history order ${placedOrderNo}`);
};

export const historyOrderCustomerId = (order: CustomerOrder): string =>
  required(required(order.customerInfo, 'customerInfo').customerId, 'customerInfo.customerId');
