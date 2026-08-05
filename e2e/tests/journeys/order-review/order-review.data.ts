import type { APIRequestContext, APIResponse, Request } from '@playwright/test';
import {
  findCategoryProductsInStore,
  findOrderableVariants,
  findStoreOrderableVariant,
} from '../../../../api/support/products';
import { bearer, customString, shopperApiUrl, withSite } from '../../../../api/support/scapi';
import type {
  Order,
  OrderProductItem,
  OrderShipment,
  Store,
  StoreResult,
} from '../../../../api/support/scapi-types';
import {
  getGuestToken,
  loginRegisteredShopper,
  requireSession,
} from '../../../../api/support/slas';
import { findNearbyStore } from '../../../../api/support/stores';
import { env } from '../../../../config/env';

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

/**
 * What Shopper Orders holds for a placed order. The pages are checked against
 * this, so every expectation traces back to what the commerce API returned.
 */
export interface PlacedOrder {
  orderNo: string;
  /** ECOM order state, e.g. created. */
  status: string;
  currency: string;
  orderTotal: number;
  productSubTotal: number;
  taxTotal: number;
  itemCount: number;
  /** Variant id the order was placed for; the images call asks for this id. */
  productId: string;
  productName: string;
  quantity: number;
  itemPrice: number;
  /** ECOM shipment state, e.g. not_shipped. */
  shippingStatus: string;
  /** Shipping method the shipment carries, e.g. Ground or Store Pickup. */
  fulfillmentName: string;
  recipientName: string;
  /** Store the shipment is collected from; absent for a delivery order. */
  pickupStoreId?: string;
}

/** What Shopper Stores holds for the store a pickup shipment names. */
export interface PickupStore {
  id: string;
  name: string;
  address1: string;
  city: string;
  stateCode: string;
  postalCode: string;
}

export interface ReviewableOrders {
  credentials: ShopperCredentials;
  delivery: PlacedOrder;
  pickup: PlacedOrder;
  store: PickupStore;
}

export const password = 'Test1234!';

// A throwaway shopper per run so parallel tests never share order history.
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

// Main product for the shipped order. The in-stock size is resolved at run time.
const deliveryMasterId = '25591139M';

// Shipping methods the demo store offers: ground delivery, and store pickup.
const deliveryMethodId = 'GBP001';
const pickupMethodId = 'GBP005';

// Woburn MA: several pickup stores in range, all sharing one store stock.
const storeArea = { countryCode: 'US', postalCode: '01801', maxDistance: '100' };

// Where the pickup product is looked for, and how deep that lookup goes.
const pickupCategoryId = 'newarrivals';
const pickupCategoryPageSize = 25;

const BASKETS = 'checkout/shopper-baskets/v1';
const ORDERS = 'checkout/shopper-orders/v1';
const CUSTOMERS = 'customer/shopper-customers/v1';
const STORES = 'store/shopper-stores/v1';

// The order detail page asks for the OMS view of an order alongside its
// fulfillment shipments; the fixture reads the order back the same way, so it
// holds exactly the payload the page rendered from.
const orderExpand = 'oms, oms_shipments';

interface Authed {
  params: Record<string, string>;
  headers: Record<string, string>;
}

type OrderItemResource = OrderProductItem;
type ShipmentResource = OrderShipment;
type OrderResource = Order;
type StoreResource = Store;
type StoresResult = StoreResult;

/** How the order is fulfilled, which decides how its shipment is set up. */
interface OrderPlan {
  productId: string;
  shippingMethodId: string;
  /** Store stock the line is taken from, for a pickup order. */
  inventoryId?: string;
  /** Store the shipment is collected from, for a pickup order. */
  fromStoreId?: string;
}

const required = <T>(value: T | undefined, what: string): T => {
  if (value === undefined) throw new Error(`the provisioned order is missing ${what}`);
  return value;
};

const ensureOk = async (response: APIResponse, what: string): Promise<void> => {
  if (!response.ok()) {
    throw new Error(`${what} failed (${response.status()}): ${await response.text()}`);
  }
};

const registerCustomer = async (
  request: APIRequestContext,
  guestToken: string,
  credentials: ShopperCredentials,
): Promise<void> => {
  const created = await request.post(shopperApiUrl(CUSTOMERS, 'customers'), {
    params: withSite(),
    headers: bearer(guestToken),
    data: {
      customer: {
        firstName: orderAddress.firstName,
        lastName: orderAddress.lastName,
        email: credentials.email,
        login: credentials.email,
      },
      password: credentials.password,
    },
  });
  await ensureOk(created, `registering ${credentials.email}`);
};

const lineFor = (plan: OrderPlan): Record<string, string | number> => ({
  productId: plan.productId,
  quantity: 1,
  ...(plan.inventoryId === undefined ? {} : { inventoryId: plan.inventoryId }),
});

const createBasketWithItem = async (
  request: APIRequestContext,
  authed: Authed,
  plan: OrderPlan,
): Promise<string> => {
  const created = (await (
    await request.post(shopperApiUrl(BASKETS, 'baskets'), { ...authed, data: {} })
  ).json()) as { basketId: string };
  const basketId = created.basketId;
  const added = await request.post(shopperApiUrl(BASKETS, `baskets/${basketId}/items`), {
    ...authed,
    data: [lineFor(plan)],
  });
  await ensureOk(added, `adding ${plan.productId} to the basket`);
  return basketId;
};

// A pickup shipment carries the store it is collected from, so it is patched as
// one change; a delivery shipment only needs its method.
const assignFulfillment = async (
  request: APIRequestContext,
  authed: Authed,
  basketId: string,
  plan: OrderPlan,
): Promise<void> => {
  if (plan.fromStoreId === undefined) {
    const chosen = await request.put(
      shopperApiUrl(BASKETS, `baskets/${basketId}/shipments/me/shipping-method`),
      { ...authed, data: { id: plan.shippingMethodId } },
    );
    await ensureOk(chosen, `choosing shipping method ${plan.shippingMethodId}`);
    return;
  }
  const assigned = await request.patch(shopperApiUrl(BASKETS, `baskets/${basketId}/shipments/me`), {
    ...authed,
    data: {
      shippingMethod: { id: plan.shippingMethodId },
      c_fromStoreId: plan.fromStoreId,
    },
  });
  await ensureOk(assigned, `assigning pickup store ${plan.fromStoreId}`);
};

const addPayment = async (
  request: APIRequestContext,
  authed: Authed,
  basketId: string,
): Promise<void> => {
  const priced = (await (
    await request.get(shopperApiUrl(BASKETS, `baskets/${basketId}`), authed)
  ).json()) as { orderTotal: number };
  const paid = await request.post(
    shopperApiUrl(BASKETS, `baskets/${basketId}/payment-instruments`),
    {
      ...authed,
      data: {
        paymentMethodId: 'CREDIT_CARD',
        paymentCard: {
          cardType: 'Visa',
          expirationMonth: 12,
          expirationYear: 2030,
          holder: `${orderAddress.firstName} ${orderAddress.lastName}`,
          securityCode: '123',
        },
        amount: priced.orderTotal,
      },
    },
  );
  await ensureOk(paid, 'paying for the basket');
};

const configureCheckout = async (
  request: APIRequestContext,
  authed: Authed,
  basketId: string,
  email: string,
  plan: OrderPlan,
): Promise<void> => {
  await request.put(shopperApiUrl(BASKETS, `baskets/${basketId}/customer`), {
    ...authed,
    data: { email },
  });
  await request.put(shopperApiUrl(BASKETS, `baskets/${basketId}/shipments/me/shipping-address`), {
    ...authed,
    data: orderAddress,
  });
  await assignFulfillment(request, authed, basketId, plan);
  await request.put(shopperApiUrl(BASKETS, `baskets/${basketId}/billing-address`), {
    ...authed,
    data: orderAddress,
  });
  await addPayment(request, authed, basketId);
};

const placeOrder = async (
  request: APIRequestContext,
  authed: Authed,
  email: string,
  plan: OrderPlan,
): Promise<string> => {
  const basketId = await createBasketWithItem(request, authed, plan);
  await configureCheckout(request, authed, basketId, email, plan);
  const placed = await request.post(shopperApiUrl(ORDERS, 'orders'), {
    ...authed,
    data: { basketId },
  });
  await ensureOk(placed, 'placing the order');
  const order = (await placed.json()) as OrderResource;
  return required(order.orderNo, 'an order number');
};

const firstItem = (order: OrderResource): OrderItemResource =>
  required(order.productItems?.[0], 'a product item');

const firstShipment = (order: OrderResource): ShipmentResource =>
  required(order.shipments?.[0], 'a shipment');

const itemCountOf = (order: OrderResource): number => (order.productItems ?? []).length;

const toPlacedOrder = (order: OrderResource): PlacedOrder => {
  const item = firstItem(order);
  const shipment = firstShipment(order);
  return {
    orderNo: required(order.orderNo, 'an order number'),
    status: required(order.status, 'a status'),
    currency: required(order.currency, 'a currency'),
    orderTotal: required(order.orderTotal, 'an order total'),
    productSubTotal: required(order.productSubTotal, 'a product subtotal'),
    taxTotal: required(order.taxTotal, 'a tax total'),
    itemCount: itemCountOf(order),
    productId: required(item.productId, 'a product id'),
    productName: required(item.productName, 'a product name'),
    quantity: required(item.quantity, 'an item quantity'),
    itemPrice: required(item.price, 'an item price'),
    shippingStatus: required(order.shippingStatus, 'a shipping status'),
    fulfillmentName: required(shipment.shippingMethod?.name, 'a shipping method name'),
    recipientName: required(shipment.shippingAddress?.fullName, 'a recipient name'),
    pickupStoreId: customString(shipment.c_fromStoreId),
  };
};

const fetchOrder = async (
  request: APIRequestContext,
  accessToken: string,
  orderNo: string,
): Promise<PlacedOrder> => {
  const response = await request.get(shopperApiUrl(ORDERS, `orders/${orderNo}`), {
    params: withSite({ locale: env.locale, expand: orderExpand }),
    headers: bearer(accessToken),
  });
  await ensureOk(response, `reading order ${orderNo} back`);
  return toPlacedOrder((await response.json()) as OrderResource);
};

const toPickupStore = (store: StoreResource | undefined, storeId: string): PickupStore => {
  const found = required(store, `store ${storeId}`);
  return {
    id: required(found.id, `an id for store ${storeId}`),
    name: required(found.name, `a name for store ${storeId}`),
    address1: required(found.address1, `a street for store ${storeId}`),
    city: required(found.city, `a city for store ${storeId}`),
    stateCode: required(found.stateCode, `a state for store ${storeId}`),
    postalCode: required(found.postalCode, `a postal code for store ${storeId}`),
  };
};

const fetchPickupStore = async (
  request: APIRequestContext,
  accessToken: string,
  storeId: string,
): Promise<PickupStore> => {
  const response = await request.get(shopperApiUrl(STORES, 'stores'), {
    params: withSite({ ids: storeId, locale: env.locale }),
    headers: bearer(accessToken),
  });
  await ensureOk(response, `reading store ${storeId}`);
  const result = (await response.json()) as StoresResult;
  return toPickupStore((result.data ?? [])[0], storeId);
};

const deliveryVariantId = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<string> => {
  const [variant] = await findOrderableVariants(request, accessToken, {
    masterId: deliveryMasterId,
    minCount: 1,
  });
  if (!variant) throw new Error('expected an orderable variant to place the shipped order with');
  return variant.variantId;
};

const storeVariantId = async (
  request: APIRequestContext,
  accessToken: string,
  inventoryId: string,
): Promise<string> => {
  const { masterIds } = await findCategoryProductsInStore(
    request,
    accessToken,
    pickupCategoryId,
    inventoryId,
    pickupCategoryPageSize,
  );
  const product = await findStoreOrderableVariant(request, accessToken, masterIds, inventoryId);
  return product.variantId;
};

/**
 * A registered shopper whose history already holds two finished orders: one
 * shipped, one collected in store. Both are placed over the commerce API so the
 * browser only has to look back at them.
 */
export const reviewableOrders = async (request: APIRequestContext): Promise<ReviewableOrders> => {
  const credentials: ShopperCredentials = { email: uniqueEmail(), password };
  const { accessToken: guestToken } = await getGuestToken(request);
  await registerCustomer(request, guestToken, credentials);

  const login = await loginRegisteredShopper(request, credentials.email, credentials.password);
  const { accessToken } = requireSession(login, credentials.email);
  const authed: Authed = { params: withSite(), headers: bearer(accessToken) };

  const deliveryOrderNo = await placeOrder(request, authed, credentials.email, {
    productId: await deliveryVariantId(request, accessToken),
    shippingMethodId: deliveryMethodId,
  });

  const store = await findNearbyStore(request, accessToken, storeArea);
  const pickupOrderNo = await placeOrder(request, authed, credentials.email, {
    productId: await storeVariantId(request, accessToken, store.inventoryId),
    shippingMethodId: pickupMethodId,
    inventoryId: store.inventoryId,
    fromStoreId: store.id,
  });

  return {
    credentials,
    delivery: await fetchOrder(request, accessToken, deliveryOrderNo),
    pickup: await fetchOrder(request, accessToken, pickupOrderNo),
    store: await fetchPickupStore(request, accessToken, store.id),
  };
};

// Text the account pages put on screen for what the order holds.
export const orderNumberLabel = (orderNo: string): string => `Order Number: ${orderNo}`;

export const itemCountLabel = (count: number): string =>
  `${count} ${count === 1 ? 'item' : 'items'}`;

export const recipientLabel = (name: string): string => `Shipped to: ${name}`;

export const quantityLabel = (quantity: number): string => `Quantity: ${quantity}`;

// Prices render in the order's own currency, formatted for the shop's locale.
export const money = (amount: number, currency: string): string =>
  new Intl.NumberFormat(env.locale, { style: 'currency', currency }).format(amount);

// Order and shipment states are stored as identifiers and displayed capitalized,
// so they are matched on the words themselves.
export const statePattern = (state: string): RegExp =>
  new RegExp(`^\\s*${state.split('_').join('\\s*')}\\s*$`, 'i');

export const storeCityLine = (store: PickupStore): RegExp =>
  new RegExp(`${store.city},\\s*${store.stateCode}\\s*${store.postalCode}`);

export const orderDetailUrlPattern = (orderNo: string): RegExp =>
  new RegExp(`/account/orders/${orderNo}$`);

export const orderHistoryUrlPattern = /\/account\/orders$/;

export const accountUrlPattern = /\/account\/?$/;

export const orderHistoryTitle = 'Order History';
export const orderDetailTitle = 'Order Details';
export const paymentMethodSection = 'Payment Method';
export const billingAddressSection = 'Billing Address';
export const orderSummarySection = 'Order Summary';
export const shipmentSection = 'Shipment';
export const shippingAddressSection = 'Shipping Address';
export const pickupAddressSection = 'Pickup Address';
export const trackingSection = 'Tracking';

// How many orders the history page asks for at a time.
export const historyPageSize = '10';
export const historyFirstPageOffset = '0';

// Which commerce services each page is expected to reach, read off the requests
// the storefront makes for itself.
const queryOf = (request: Request): URLSearchParams => new URL(request.url()).searchParams;
const pathOf = (request: Request): string => new URL(request.url()).pathname;
const isRead = (request: Request): boolean => request.method() === 'GET';

/** Expansions a request asked for, e.g. ['oms', 'oms_shipments']. */
export const expandValues = (request: Request): string[] =>
  (queryOf(request).get('expand') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

/** Ids a request asked for, e.g. the variants or stores to resolve. */
export const requestedIds = (request: Request): string[] =>
  (queryOf(request).get('ids') ?? '').split(',').filter((value) => value.length > 0);

export const paramOf = (request: Request, name: string): string | null =>
  queryOf(request).get(name);

/** Shopper Customers: the shopper's own order list. */
export const customerOrdersCall = (request: Request): boolean =>
  isRead(request) &&
  pathOf(request).includes('/customer/shopper-customers/v1/') &&
  pathOf(request).endsWith('/orders');

/** Shopper Orders: one order in full. */
export const orderDetailCall =
  (orderNo: string) =>
  (request: Request): boolean =>
    isRead(request) &&
    pathOf(request).includes('/checkout/shopper-orders/v1/') &&
    pathOf(request).endsWith(`/orders/${orderNo}`);

/** Shopper Products: the product details and images an order line is shown with. */
export const productsCall =
  (productId: string) =>
  (request: Request): boolean =>
    isRead(request) &&
    pathOf(request).includes('/product/shopper-products/v1/') &&
    pathOf(request).endsWith('/products') &&
    requestedIds(request).includes(productId);

/** Shopper Stores: the store a pickup shipment is collected from. */
export const storesCall =
  (storeId: string) =>
  (request: Request): boolean =>
    isRead(request) &&
    pathOf(request).includes('/store/shopper-stores/v1/') &&
    pathOf(request).endsWith('/stores') &&
    requestedIds(request).includes(storeId);
