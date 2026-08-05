import type { APIRequestContext, APIResponse, Request } from '@playwright/test';
import { findOrderableVariants } from '../../../../api/support/products';
import { bearer, shopperApiUrl, withSite } from '../../../../api/support/scapi';
import { getGuestToken, loginRegisteredShopper } from '../../../../api/support/slas';
import { env } from '../../../../config/env';
import type { OrderResource, ShopperCredentials } from '../../../support/oms';
import { orderExpand, readOmsActivation } from '../../../support/oms';

// The other side of the three Order Management journeys, and the only side the
// public demo can prove: what an order that Order Management has NOT ingested is
// allowed to do.
//
// The storefront ships no flag for the OMS actions — they are gated purely on OMS
// state being attached to the order — so an order without it must expose none of
// them and must fall back to its own ECOM status everywhere. That is a real
// cross-service claim about Shopper Orders and the OMS expansion, and it is what
// keeps the gate honest: without it, "no buttons rendered" could equally mean the
// page is broken.

const BASKETS = 'checkout/shopper-baskets/v1';
const ORDERS = 'checkout/shopper-orders/v1';
const CUSTOMERS = 'customer/shopper-customers/v1';

const deliveryMasterId = '25591139M';
const deliveryMethodId = 'GBP001';

export const password = 'Test1234!';

export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

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

/** What Shopper Orders holds for the order, which every expectation traces back to. */
export interface EcomOrder {
  orderNo: string;
  status: string;
  shippingStatus: string;
  fulfillmentName: string;
  productName: string;
  itemCount: number;
}

export interface EcomFallbackCondition {
  met: boolean;
  /** Why the journey does or does not apply here, for the skip annotation. */
  reason: string;
  credentials: ShopperCredentials;
  order: EcomOrder;
  /** The order exactly as Shopper Orders returned it under both OMS expansions. */
  payload: OrderResource;
}

interface Authed {
  params: Record<string, string>;
  headers: Record<string, string>;
}

const emptyOrder: EcomOrder = {
  orderNo: '',
  status: '',
  shippingStatus: '',
  fulfillmentName: '',
  productName: '',
  itemCount: 0,
};

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

const createBasketWithItem = async (
  request: APIRequestContext,
  authed: Authed,
  productId: string,
): Promise<string> => {
  const created = (await (
    await request.post(shopperApiUrl(BASKETS, 'baskets'), { ...authed, data: {} })
  ).json()) as { basketId: string };
  const added = await request.post(shopperApiUrl(BASKETS, `baskets/${created.basketId}/items`), {
    ...authed,
    data: [{ productId, quantity: 1 }],
  });
  await ensureOk(added, `adding ${productId} to the basket`);
  return created.basketId;
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
): Promise<void> => {
  await request.put(shopperApiUrl(BASKETS, `baskets/${basketId}/customer`), {
    ...authed,
    data: { email },
  });
  await request.put(shopperApiUrl(BASKETS, `baskets/${basketId}/shipments/me/shipping-address`), {
    ...authed,
    data: orderAddress,
  });
  const chosen = await request.put(
    shopperApiUrl(BASKETS, `baskets/${basketId}/shipments/me/shipping-method`),
    { ...authed, data: { id: deliveryMethodId } },
  );
  await ensureOk(chosen, `choosing shipping method ${deliveryMethodId}`);
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
  productId: string,
): Promise<string> => {
  const basketId = await createBasketWithItem(request, authed, productId);
  await configureCheckout(request, authed, basketId, email);
  const placed = await request.post(shopperApiUrl(ORDERS, 'orders'), {
    ...authed,
    data: { basketId },
  });
  await ensureOk(placed, 'placing the order');
  return required(((await placed.json()) as OrderResource).orderNo, 'an order number');
};

const toEcomOrder = (order: OrderResource): EcomOrder => {
  const item = required(order.productItems?.[0], 'a product item');
  const shipment = required(order.shipments?.[0], 'a shipment');
  return {
    orderNo: required(order.orderNo, 'an order number'),
    status: required(order.status, 'a status'),
    shippingStatus: required(order.shippingStatus, 'a shipping status'),
    fulfillmentName: required(shipment.shippingMethod?.name, 'a shipping method name'),
    productName: required(item.productName, 'a product name'),
    itemCount: (order.productItems ?? []).length,
  };
};

const readBack = async (
  request: APIRequestContext,
  accessToken: string,
  orderNo: string,
): Promise<OrderResource> => {
  const response = await request.get(shopperApiUrl(ORDERS, `orders/${orderNo}`), {
    params: withSite({ locale: env.locale, expand: orderExpand }),
    headers: bearer(accessToken),
  });
  await ensureOk(response, `reading order ${orderNo} back`);
  return (await response.json()) as OrderResource;
};

const ingestedReason = (orderNo: string): string =>
  `order ${orderNo} came back carrying omsData, so this storefront ingests orders into Order ` +
  'Management and no ECOM-only order exists here to assert the fallback against';

/**
 * A registered shopper whose freshly placed order Order Management has not
 * ingested, proven by reading the order back exactly the way the order detail
 * page does.
 */
export const ecomOnlyOrder = async (request: APIRequestContext): Promise<EcomFallbackCondition> => {
  const credentials: ShopperCredentials = { email: uniqueEmail(), password };
  const { accessToken: guestToken } = await getGuestToken(request);
  await registerCustomer(request, guestToken, credentials);

  const login = await loginRegisteredShopper(request, credentials.email, credentials.password);
  const accessToken = required(login.accessToken, 'an authenticated session');
  const authed: Authed = { params: withSite(), headers: bearer(accessToken) };

  const [variant] = await findOrderableVariants(request, accessToken, {
    masterId: deliveryMasterId,
    minCount: 1,
  });
  const productId = required(variant, 'an orderable variant').variantId;

  const orderNo = await placeOrder(request, authed, credentials.email, productId);
  const order = await readBack(request, accessToken, orderNo);
  if (order.omsData !== undefined) {
    return {
      met: false,
      reason: ingestedReason(orderNo),
      credentials,
      order: emptyOrder,
      payload: order,
    };
  }

  const activation = await readOmsActivation(request);
  return {
    met: true,
    reason: `Order Management reports: ${activation.reason}`,
    credentials,
    order: toEcomOrder(order),
    payload: order,
  };
};

/** Lines carrying OMS state of their own, which an un-ingested order has none of. */
export const itemsWithOmsState = (order: OrderResource): number =>
  (order.productItems ?? []).filter((item) => item.omsData !== undefined).length;

export const orderActionsHeading = 'Order Actions';
export const orderDetailTitle = 'Order Details';
export const trackingHeading = 'Tracking';
export const trackShipmentLabel = 'Track Shipment';
export const cancelOrderLabel = 'Cancel Order';
export const startReturnLabel = 'Return Items';

/** How the page names an ECOM shipment state it has no OMS state to replace. */
const shippingStatusLabels: Record<string, string> = {
  not_shipped: 'Not shipped',
  part_shipped: 'Partially shipped',
  shipped: 'Shipped',
};

export const shippingStatusLabel = (status: string): string =>
  shippingStatusLabels[status] ?? status;

export const orderNumberLabel = (orderNo: string): string => `Order Number: ${orderNo}`;

/** States are stored as identifiers and displayed capitalized, so matched on the words. */
export const statePattern = (state: string): RegExp =>
  new RegExp(`^\\s*${state.split('_').join('\\s*')}\\s*$`, 'i');

export const orderDetailUrlPattern = (orderNo: string): RegExp =>
  new RegExp(`/account/orders/${orderNo}$`);

export const orderHistoryUrlPattern = /\/account\/orders$/;
export const accountUrlPattern = /\/account\/?$/;

const pathOf = (request: Request): string => new URL(request.url()).pathname;

export const orderDetailCall =
  (orderNo: string) =>
  (request: Request): boolean =>
    request.method() === 'GET' &&
    pathOf(request).includes(`/${ORDERS}/`) &&
    pathOf(request).endsWith(`/orders/${orderNo}`);

/** Anything the page would only ask Order Management for on an OMS-backed order. */
export const omsOnlyCall = (request: Request): boolean =>
  pathOf(request).endsWith('/orders/oms-meta-data') ||
  pathOf(request).includes('/actions/oms-cancel-order') ||
  pathOf(request).includes('/actions/oms-return-order');

export const expandValues = (request: Request): string[] =>
  (new URL(request.url()).searchParams.get('expand') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
