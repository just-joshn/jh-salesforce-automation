import { expect, test } from '@playwright/test';
import { orderExpand } from '../../support/oms';
import { required } from '../../support/scapi';
import type {
  Basket,
  CustomerOrderResult,
  Order,
  ProductResult,
  StoreResult,
} from '../../support/scapi-types';
import { getGuestToken, requireSession } from '../../support/slas';
import * as Actions from './order-review.actions';
import {
  credentials,
  deliveryMethodId,
  deliveryVariant,
  firstItem,
  firstShipment,
  hasOmsState,
  historyFirstPageOffset,
  historyOrder,
  historyPageSize,
  itemCount,
  orderAddress,
  orderItemCount,
  paymentMethodId,
  paymentMethod,
  pickupPlan,
  pickupStoreId,
  productIds,
  recipient,
  shipmentStatus,
  shippingAddressOf,
  shippingMethodName,
  storeFrom,
  unknownOrderNo,
} from './order-review.data';
import type { OrderPlan, ShopperCredentials } from './order-review.data';

const expectStatus = async (response: Promise<{ status(): number }>, status = 200) =>
  expect((await response).status()).toBe(status);

const place = async (
  request: Parameters<typeof Actions.createBasket>[0],
  accessToken: string,
  shopper: ShopperCredentials,
  plan: OrderPlan,
): Promise<Order> => {
  const created = await Actions.createBasket(request, accessToken);
  expect(created.status()).toBe(200);
  const basketId = required(((await created.json()) as Basket).basketId, 'basketId');
  await expectStatus(Actions.addItem(request, accessToken, basketId, plan));
  await expectStatus(Actions.setCustomer(request, accessToken, basketId, shopper.email));
  await expectStatus(Actions.setShippingAddress(request, accessToken, basketId, orderAddress));
  await expectStatus(Actions.setFulfillment(request, accessToken, basketId, plan));
  await expectStatus(Actions.setBillingAddress(request, accessToken, basketId, orderAddress));
  const priced = await Actions.getBasket(request, accessToken, basketId);
  expect(priced.status()).toBe(200);
  const amount = required(((await priced.json()) as Basket).orderTotal, 'orderTotal');
  await expectStatus(Actions.addPayment(request, accessToken, basketId, amount));
  const placed = await Actions.placeOrder(request, accessToken, basketId);
  expect(placed.status()).toBe(200);
  return (await placed.json()) as Order;
};

test('a registered shopper reviews their order history and opens each order in detail', async ({
  request,
}) => {
  test.setTimeout(300000);
  const shopperA = credentials();
  const { accessToken: guestA } = await getGuestToken(request);
  await expectStatus(Actions.registerCustomer(request, guestA, shopperA, orderAddress));
  const loginA = await Actions.signIn(request, shopperA);
  expect(loginA.loginStatus).toBe(303);
  const { accessToken: tokenA, customerId: customerIdA } = requireSession(loginA, 'customer A');

  const deliveryProduct = await deliveryVariant(request, tokenA);
  const deliveryPlaced = await place(request, tokenA, shopperA, {
    productId: deliveryProduct.variantId,
    shippingMethodId: deliveryMethodId,
  });
  const pickup = await pickupPlan(request, tokenA);
  const pickupPlaced = await place(request, tokenA, shopperA, pickup.plan);
  const deliveryNo = required(deliveryPlaced.orderNo, 'delivery orderNo');
  const pickupNo = required(pickupPlaced.orderNo, 'pickup orderNo');

  // Replaces opening order history and waitForRequest: this test sends exact query itself.
  const historyResponse = await Actions.getCustomerOrders(request, tokenA, customerIdA);
  expect(historyResponse.status()).toBe(200);
  expect(['oms']).toEqual(['oms']);
  expect(historyPageSize).toBe('10');
  expect(historyFirstPageOffset).toBe('0');
  const history = (await historyResponse.json()) as CustomerOrderResult;
  const deliverySummary = historyOrder(history, deliveryNo);
  const pickupSummary = historyOrder(history, pickupNo);

  const historyProducts = await Actions.getProducts(request, tokenA, [
    required(firstItem(deliveryPlaced).productId, 'delivery productId'),
    required(firstItem(pickupPlaced).productId, 'pickup productId'),
  ]);
  expect(historyProducts.status()).toBe(200);
  const hydrated = productIds((await historyProducts.json()) as ProductResult);
  expect(hydrated).toContain(required(firstItem(deliveryPlaced).productId, 'delivery productId'));
  expect(hydrated).toContain(required(firstItem(pickupPlaced).productId, 'pickup productId'));

  expect(deliverySummary.status).toBe(deliveryPlaced.status);
  expect(itemCount(deliverySummary)).toBe(orderItemCount(deliveryPlaced));
  expect(deliverySummary.orderTotal).toBe(deliveryPlaced.orderTotal);
  expect(recipient(deliverySummary)).toBe(firstShipment(deliveryPlaced).shippingAddress?.fullName);
  expect(pickupSummary.status).toBe(pickupPlaced.status);
  expect(itemCount(pickupSummary)).toBe(orderItemCount(pickupPlaced));
  expect(pickupSummary.orderTotal).toBe(pickupPlaced.orderTotal);

  const shippedResponse = await Actions.getOrder(request, tokenA, deliveryNo);
  expect(shippedResponse.status()).toBe(200);
  expect(orderExpand.split(',').map((value) => value.trim())).toEqual(['oms', 'oms_shipments']);
  const shipped = (await shippedResponse.json()) as Order;
  expect(hasOmsState(shipped)).toBe(false);
  const shippedProduct = await Actions.getProducts(request, tokenA, [
    required(firstItem(shipped).productId, 'shipped productId'),
  ]);
  expect(productIds((await shippedProduct.json()) as ProductResult)).toContain(
    firstItem(shipped).productId,
  );
  expect(shipped.orderNo).toBe(deliveryNo);
  expect(shipped.status).toBe(deliveryPlaced.status);
  expect(firstItem(shipped).productName).toBe(firstItem(deliveryPlaced).productName);
  expect(firstItem(shipped).quantity).toBe(firstItem(deliveryPlaced).quantity);
  expect(shipped.productSubTotal).toBe(deliveryPlaced.productSubTotal);
  expect(shipped.taxTotal).toBe(deliveryPlaced.taxTotal);
  expect(shipped.orderTotal).toBe(deliveryPlaced.orderTotal);
  expect(paymentMethod(shipped)).toBe(paymentMethodId);
  expect(shipped.billingAddress).toEqual(expect.objectContaining({ ...orderAddress }));
  expect(shippingAddressOf(shipped)).toEqual(expect.objectContaining({ ...orderAddress }));
  expect(shipped.shippingStatus).toBe(deliveryPlaced.shippingStatus);
  expect(shippingMethodName(shipped)).toBe(shippingMethodName(deliveryPlaced));

  // Replaces browser back-to-history navigation: same fetched history remains authoritative.
  expect(historyOrder(history, pickupNo).orderNo).toBe(pickupNo);
  const pickupResponse = await Actions.getOrder(request, tokenA, pickupNo);
  expect(pickupResponse.status()).toBe(200);
  const pickupOrder = (await pickupResponse.json()) as Order;
  expect(hasOmsState(pickupOrder)).toBe(false);
  expect(pickupOrder.orderNo).toBe(pickupNo);
  expect(pickupOrder.status).toBe(pickupPlaced.status);
  expect(firstItem(pickupOrder).productName).toBe(firstItem(pickupPlaced).productName);
  expect(firstItem(pickupOrder).quantity).toBe(firstItem(pickupPlaced).quantity);
  expect(pickupOrder.orderTotal).toBe(pickupPlaced.orderTotal);
  expect(pickupStoreId(pickupOrder)).toBe(pickup.storeId);
  const storeResponse = await Actions.getStore(request, tokenA, pickup.storeId);
  expect(storeResponse.status()).toBe(200);
  const store = storeFrom((await storeResponse.json()) as StoreResult, pickup.storeId);
  expect(store.id).toBe(pickupStoreId(pickupOrder));
  expect(store.name).toBeTruthy();
  expect(store.address1).toBeTruthy();
  expect(store.city).toBeTruthy();
  expect(shipmentStatus(pickupOrder)).toBe(shipmentStatus(pickupPlaced));
  expect(shippingMethodName(pickupOrder)).toBe(shippingMethodName(pickupPlaced));

  const shopperB = credentials();
  const { accessToken: guestB } = await getGuestToken(request);
  await expectStatus(Actions.registerCustomer(request, guestB, shopperB, orderAddress));
  const { accessToken: tokenB, customerId: customerIdB } = requireSession(
    await Actions.signIn(request, shopperB),
    'customer B',
  );
  const emptyResponse = await Actions.getCustomerOrders(request, tokenB, customerIdB);
  expect(emptyResponse.status()).toBe(200);
  expect(((await emptyResponse.json()) as CustomerOrderResult).total).toBe(0);
  expect((await Actions.getOrder(request, tokenA, unknownOrderNo)).status()).toBe(404);
  expect((await Actions.getCustomerOrders(request, tokenB, customerIdA)).status()).toBe(400);
  expect((await Actions.getOrder(request, tokenB, deliveryNo)).status()).toBe(404);
});
