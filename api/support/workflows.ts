import { expect, type APIRequestContext } from '@playwright/test';
import { BasketsClient } from './baskets.client';
import type { PickupStore } from './store-types';
import { OrdersClient } from './orders.client';
import type { Order } from './scapi-types';
import { StoresClient } from './stores.client';
import type { AddressInput, CreditCardInput } from './test-data';

/**
 * Scenario helpers composing several clients into one multi-call flow — the API-suite
 * counterparts of e2e/support/workflows.ts, mirroring the exact call order the checkout
 * UI issues (email -> shipping address -> shipping method -> payment instrument ->
 * billing address -> amount pin -> place order).
 */
export interface Session {
  accessToken: string;
  customerId: string;
}

/**
 * Resolves the shopper's open basket, creating one only when none exists — the same
 * GET-then-create dance the storefront performs on every session bootstrap (a customer
 * may hold only one open basket, so blind creation answers 400 quota-exceeded).
 */
export async function getOrCreateBasket(
  request: APIRequestContext,
  session: Session,
): Promise<{ basketId: string }> {
  const baskets = new BasketsClient(request);
  const existing = await baskets.listCustomerBaskets(session.accessToken, session.customerId);
  const open = existing.find((basket) => basket.status !== 'completed');
  if (open?.basketId) {
    return { basketId: open.basketId };
  }
  const created = await baskets.createBasket(session.accessToken);
  if (!created.basketId) {
    throw new Error('Created basket carries no basketId');
  }
  return { basketId: created.basketId };
}

export interface OrderPlacement {
  order: Order;
  instrumentId: string;
}

function shippingMethodId(
  methods: Awaited<ReturnType<BasketsClient['getShippingMethods']>>,
  shipmentId: string,
): string {
  const ground =
    methods.applicableShippingMethods.find((method) => /ground/i.test(method.name)) ??
    methods.applicableShippingMethods[0];
  if (!ground) {
    throw new Error(`No applicable shipping method for shipment ${shipmentId}`);
  }
  return ground.id;
}

function requiredItemId(
  basket: Awaited<ReturnType<BasketsClient['addItem']>>,
  productId: string,
): string {
  const line = basket.productItems?.find((item) => item.productId === productId);
  if (!line?.itemId) {
    throw new Error(`Product ${productId} was not present after add`);
  }
  return line.itemId;
}

async function setShippingMethods(
  baskets: BasketsClient,
  accessToken: string,
  basketId: string,
  shipmentIds: readonly string[],
): Promise<void> {
  for (const shipmentId of shipmentIds) {
    const methods = await baskets.getShippingMethods(accessToken, basketId, shipmentId);
    const methodId = shippingMethodId(methods, shipmentId);
    await baskets.setShippingMethod(accessToken, basketId, shipmentId, methodId);
  }
}

/** Shared tail of every checkout: shipping method -> payment -> place. */
async function completeAndPlace(
  request: APIRequestContext,
  session: Session,
  basketId: string,
  options: { shippingAddress: AddressInput; billingAddress: AddressInput; card: CreditCardInput },
): Promise<OrderPlacement> {
  const baskets = new BasketsClient(request);

  await baskets.setShippingAddress(session.accessToken, basketId, options.shippingAddress);
  const methods = await baskets.getShippingMethods(session.accessToken, basketId, 'me');
  const methodId = shippingMethodId(methods, 'me');
  await baskets.setShippingMethod(session.accessToken, basketId, 'me', methodId);

  const { instrumentId } = await baskets.setCreditCardPayment(
    session.accessToken,
    basketId,
    options.card,
  );
  await baskets.setBillingAddress(session.accessToken, basketId, options.billingAddress);
  const finalBasket = await baskets.getBasket(session.accessToken, basketId);
  await baskets.pinPaymentAmount(
    session.accessToken,
    basketId,
    instrumentId,
    finalBasket.orderTotal ?? 0,
  );

  const order = await new OrdersClient(request).placeOrder(session.accessToken, basketId);
  return { order, instrumentId };
}

/** Guest checkout: contact email first, then the shared tail. */
export async function placeGuestOrder(
  request: APIRequestContext,
  session: Session,
  email: string,
  item: { productId: string; price: number },
  address: AddressInput,
  card: CreditCardInput,
): Promise<OrderPlacement> {
  const baskets = new BasketsClient(request);
  const { basketId } = await getOrCreateBasket(request, session);
  await baskets.addItem(session.accessToken, basketId, item.productId, item.price);
  await baskets.setCustomerEmail(session.accessToken, basketId, email);
  return completeAndPlace(request, session, basketId, {
    shippingAddress: address,
    billingAddress: address,
    card,
  });
}

/**
 * B9/H2's setup — a real, freshly-placed order for an already-authenticated shopper
 * (no guest contact step), mirroring e2e's placeSignedInOrder.
 */
export async function placeSignedInOrder(
  request: APIRequestContext,
  session: Session,
  item: { productId: string; price: number },
  address: AddressInput,
  card: CreditCardInput,
): Promise<OrderPlacement> {
  const baskets = new BasketsClient(request);
  const { basketId } = await getOrCreateBasket(request, session);
  await baskets.addItem(session.accessToken, basketId, item.productId, item.price);
  return completeAndPlace(request, session, basketId, {
    shippingAddress: address,
    billingAddress: address,
    card,
  });
}

/** E2's BOPIS variant: pickup shipment instead of a shipping address, plus billing. */
export async function placePickupOrder(
  request: APIRequestContext,
  session: Session,
  email: string,
  item: { productId: string; price: number; inventoryId: string },
  store: PickupStore,
  billingAddress: AddressInput,
  card: CreditCardInput,
): Promise<OrderPlacement> {
  const baskets = new BasketsClient(request);
  const { basketId } = await getOrCreateBasket(request, session);
  await baskets.addItem(
    session.accessToken,
    basketId,
    item.productId,
    item.price,
    1,
    item.inventoryId,
  );
  await baskets.setPickupShipment(session.accessToken, basketId, store);
  await baskets.setCustomerEmail(session.accessToken, basketId, email);

  const { instrumentId } = await baskets.setCreditCardPayment(session.accessToken, basketId, card);
  await baskets.setBillingAddress(session.accessToken, basketId, billingAddress);
  const finalBasket = await baskets.getBasket(session.accessToken, basketId);
  await baskets.pinPaymentAmount(
    session.accessToken,
    basketId,
    instrumentId,
    finalBasket.orderTotal ?? 0,
  );
  const order = await new OrdersClient(request).placeOrder(session.accessToken, basketId);
  return { order, instrumentId };
}

/** E3's multi-ship variant: two delivery groups, one order, one payment. */
export async function placeMultiShipOrder(
  request: APIRequestContext,
  session: Session,
  email: string,
  firstItem: { productId: string; price: number },
  secondItem: { productId: string; price: number },
  firstAddress: AddressInput,
  secondAddress: AddressInput,
  card: CreditCardInput,
): Promise<OrderPlacement> {
  const baskets = new BasketsClient(request);
  const { basketId } = await getOrCreateBasket(request, session);
  const afterFirst = await baskets.addItem(
    session.accessToken,
    basketId,
    firstItem.productId,
    firstItem.price,
  );
  const afterBoth = await baskets.addItem(
    session.accessToken,
    basketId,
    secondItem.productId,
    secondItem.price,
  );
  const secondItemId = requiredItemId(afterBoth, secondItem.productId);
  expect(afterFirst.productItems).toHaveLength(1);

  await baskets.setCustomerEmail(session.accessToken, basketId, email);
  await baskets.setShippingAddress(session.accessToken, basketId, firstAddress);
  // The storefront mints the second shipment's id client-side; mirror that.
  const shipmentId = `shipment_${crypto.randomUUID().replace(/-/g, '').slice(0, 22)}`;
  await baskets.createShipment(session.accessToken, basketId, shipmentId, secondAddress);
  await baskets.moveItemToShipment(
    session.accessToken,
    basketId,
    secondItemId,
    secondItem.productId,
    shipmentId,
  );

  await setShippingMethods(baskets, session.accessToken, basketId, ['me', shipmentId]);

  const { instrumentId } = await baskets.setCreditCardPayment(session.accessToken, basketId, card);
  await baskets.setBillingAddress(session.accessToken, basketId, firstAddress);
  const finalBasket = await baskets.getBasket(session.accessToken, basketId);
  await baskets.pinPaymentAmount(
    session.accessToken,
    basketId,
    instrumentId,
    finalBasket.orderTotal ?? 0,
  );
  const order = await new OrdersClient(request).placeOrder(session.accessToken, basketId);
  return { order, instrumentId };
}

/** F1/E2 helper: resolves the nearest store exactly as the locator does. */
export async function nearestStore(
  request: APIRequestContext,
  accessToken: string,
): Promise<PickupStore> {
  const stores = await new StoresClient(request).searchByPostalCode(accessToken, '94103');
  const first = stores[0];
  if (!first) {
    throw new Error('store-search returned no stores');
  }
  return first;
}
