import { expect, type APIRequestContext } from '@playwright/test';
import { BasketsClient } from './baskets.client';
import { CheckoutClient } from './checkout.client';
import { CustomerBasketsClient } from './customer-baskets.client';
import type { PickupStore } from './store-types';
import { OrdersClient } from './orders.client';
import type { Order } from './scapi-types';
import { StoresClient } from './stores.client';
import { STORE_LOCATOR_ZIP, type AddressInput, type CreditCardInput } from './test-data';

export interface Session {
  accessToken: string;
  customerId: string;
}

export async function getOrCreateBasket(
  request: APIRequestContext,
  session: Session,
): Promise<{ basketId: string }> {
  const baskets = new BasketsClient(request);
  const existing = await new CustomerBasketsClient(request).listCustomerBaskets(session.accessToken, session.customerId);
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
  methods: Awaited<ReturnType<CheckoutClient['getShippingMethods']>>,
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
  checkout: CheckoutClient,
  accessToken: string,
  basketId: string,
  shipmentIds: readonly string[],
): Promise<void> {
  for (const shipmentId of shipmentIds) {
    const methods = await checkout.getShippingMethods(accessToken, basketId, shipmentId);
    const methodId = shippingMethodId(methods, shipmentId);
    await checkout.setShippingMethod(accessToken, basketId, shipmentId, methodId);
  }
}

async function completeAndPlace(
  request: APIRequestContext,
  session: Session,
  basketId: string,
  options: { shippingAddress: AddressInput; billingAddress: AddressInput; card: CreditCardInput },
): Promise<OrderPlacement> {
  const baskets = new BasketsClient(request);
  const checkout = new CheckoutClient(request);

  await checkout.setShippingAddress(session.accessToken, basketId, options.shippingAddress);
  const methods = await checkout.getShippingMethods(session.accessToken, basketId, 'me');
  const methodId = shippingMethodId(methods, 'me');
  await checkout.setShippingMethod(session.accessToken, basketId, 'me', methodId);

  const { instrumentId } = await checkout.setCreditCardPayment(
    session.accessToken,
    basketId,
    options.card,
  );
  await checkout.setBillingAddress(session.accessToken, basketId, options.billingAddress);
  const finalBasket = await baskets.getBasket(session.accessToken, basketId);
  await checkout.pinPaymentAmount(
    session.accessToken,
    basketId,
    instrumentId,
    finalBasket.orderTotal ?? 0,
  );

  const order = await new OrdersClient(request).placeOrder(session.accessToken, basketId);
  return { order, instrumentId };
}

export async function placeGuestOrder(
  request: APIRequestContext,
  session: Session,
  email: string,
  item: { productId: string; price: number },
  address: AddressInput,
  card: CreditCardInput,
): Promise<OrderPlacement> {
  const baskets = new BasketsClient(request);
  const checkout = new CheckoutClient(request);
  const { basketId } = await getOrCreateBasket(request, session);
  await baskets.addItem(session.accessToken, basketId, item.productId, item.price);
  await checkout.setCustomerEmail(session.accessToken, basketId, email);
  return completeAndPlace(request, session, basketId, {
    shippingAddress: address,
    billingAddress: address,
    card,
  });
}

export async function placeSignedInOrder(
  request: APIRequestContext,
  session: Session,
  item: { productId: string; price: number },
  address: AddressInput,
  card: CreditCardInput,
): Promise<OrderPlacement> {
  const baskets = new BasketsClient(request);
  const checkout = new CheckoutClient(request);
  const { basketId } = await getOrCreateBasket(request, session);
  await baskets.addItem(session.accessToken, basketId, item.productId, item.price);
  return completeAndPlace(request, session, basketId, {
    shippingAddress: address,
    billingAddress: address,
    card,
  });
}

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
  const checkout = new CheckoutClient(request);
  const { basketId } = await getOrCreateBasket(request, session);
  await baskets.addItem(
    session.accessToken,
    basketId,
    item.productId,
    item.price,
    1,
    item.inventoryId,
  );
  await checkout.setPickupShipment(session.accessToken, basketId, store);
  await checkout.setCustomerEmail(session.accessToken, basketId, email);

  const { instrumentId } = await checkout.setCreditCardPayment(session.accessToken, basketId, card);
  await checkout.setBillingAddress(session.accessToken, basketId, billingAddress);
  const finalBasket = await baskets.getBasket(session.accessToken, basketId);
  await checkout.pinPaymentAmount(
    session.accessToken,
    basketId,
    instrumentId,
    finalBasket.orderTotal ?? 0,
  );
  const order = await new OrdersClient(request).placeOrder(session.accessToken, basketId);
  return { order, instrumentId };
}

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
  const checkout = new CheckoutClient(request);
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

  await checkout.setCustomerEmail(session.accessToken, basketId, email);
  await checkout.setShippingAddress(session.accessToken, basketId, firstAddress);
  const shipmentId = `shipment_${crypto.randomUUID().replace(/-/g, '').slice(0, 22)}`;
  await checkout.createShipment(session.accessToken, basketId, shipmentId, secondAddress);
  await checkout.moveItemToShipment(
    session.accessToken,
    basketId,
    secondItemId,
    secondItem.productId,
    shipmentId,
  );

  await setShippingMethods(checkout, session.accessToken, basketId, ['me', shipmentId]);

  const { instrumentId } = await checkout.setCreditCardPayment(session.accessToken, basketId, card);
  await checkout.setBillingAddress(session.accessToken, basketId, firstAddress);
  const finalBasket = await baskets.getBasket(session.accessToken, basketId);
  await checkout.pinPaymentAmount(
    session.accessToken,
    basketId,
    instrumentId,
    finalBasket.orderTotal ?? 0,
  );
  const order = await new OrdersClient(request).placeOrder(session.accessToken, basketId);
  return { order, instrumentId };
}

export async function nearestStore(
  request: APIRequestContext,
  accessToken: string,
): Promise<PickupStore> {
  const stores = await new StoresClient(request).searchByPostalCode(
    accessToken,
    STORE_LOCATOR_ZIP,
  );
  const first = stores[0];
  if (!first) {
    throw new Error('store-search returned no stores');
  }
  return first;
}
