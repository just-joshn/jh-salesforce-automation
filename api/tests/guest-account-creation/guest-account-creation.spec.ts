import { expect, test } from '@playwright/test';
import { required } from '../../support/scapi';
import type { Basket, Customer, Order } from '../../support/scapi-types';
import { getGuestToken, requireSession } from '../../support/slas';
import * as Actions from './guest-account-creation.actions';
import {
  basketLines,
  guestAccountCondition,
  hasAddress,
  orderIdentityFrom,
  orderIdentityFields,
  registrant,
  savedAddressesFrom,
  secondShipmentId,
  sharedAddress,
  twoDeliveryVariants,
} from './guest-account-creation.data';

const expectStatus = async (response: Promise<{ status(): number }>) =>
  expect((await response).status()).toBe(200);

test('a guest turns a finished purchase into an account carrying the order addresses', async ({
  request,
}) => {
  test.setTimeout(420000);
  const condition = await guestAccountCondition(request);
  test.skip(!condition.met, condition.reason);
  const who = registrant();
  const [first, second] = await twoDeliveryVariants(request);
  const { accessToken: guestToken } = await getGuestToken(request);

  const created = await Actions.createBasket(request, guestToken);
  expect(created.status()).toBe(200);
  const basketId = required(((await created.json()) as Basket).basketId, 'basketId');
  const added = await Actions.addItems(request, guestToken, basketId, [
    first.variantId,
    second.variantId,
  ]);
  expect(added.status()).toBe(200);
  const basket = (await added.json()) as Basket;
  expect(basketLines(basket).map((line) => line.productId)).toEqual(
    expect.arrayContaining([first.variantId, second.variantId]),
  );

  await expectStatus(Actions.setCustomer(request, guestToken, basketId, who.email));
  await expectStatus(Actions.createShipment(request, guestToken, basketId, secondShipmentId));
  const secondLine = required(
    basketLines(basket).find((line) => line.productId === second.variantId),
    'second basket line',
  );
  await expectStatus(
    Actions.moveItem(
      request,
      guestToken,
      basketId,
      required(secondLine.itemId, 'second itemId'),
      required(secondLine.productId, 'second productId'),
      required(secondLine.quantity, 'second quantity'),
      secondShipmentId,
    ),
  );
  await expectStatus(
    Actions.setShippingAddress(request, guestToken, basketId, 'me', sharedAddress),
  );
  await expectStatus(Actions.setShippingMethod(request, guestToken, basketId, 'me'));
  await expectStatus(
    Actions.setShippingAddress(request, guestToken, basketId, secondShipmentId, sharedAddress),
  );
  await expectStatus(Actions.setShippingMethod(request, guestToken, basketId, secondShipmentId));
  await expectStatus(Actions.setBillingAddress(request, guestToken, basketId, sharedAddress));
  const priced = await Actions.getBasket(request, guestToken, basketId);
  expect(priced.status()).toBe(200);
  const amount = required(((await priced.json()) as Basket).orderTotal, 'orderTotal');
  await expectStatus(Actions.addPayment(request, guestToken, basketId, amount));
  const placed = await Actions.placeOrder(request, guestToken, basketId);
  expect(placed.status()).toBe(200);
  const placedOrder = (await placed.json()) as Order;
  const orderNo = required(placedOrder.orderNo, 'orderNo');
  const readBack = await Actions.getOrder(request, guestToken, orderNo);
  expect(readBack.status()).toBe(200);
  const order = (await readBack.json()) as Order;
  const identity = orderIdentityFrom(order);
  const sourceIdentity = orderIdentityFields(order);

  // Replaces confirmation URL/headings/order-number rendering with finished Shopper Orders payload.
  expect(identity.orderNo).toBe(sourceIdentity.orderNo);
  expect(identity.email).toBe(sourceIdentity.email);
  expect(identity.firstName).toBe(sourceIdentity.firstName);
  expect(identity.lastName).toBe(sourceIdentity.lastName);
  expect(identity.email).toBe(who.email);
  expect(identity.firstName).toBe(sharedAddress.firstName);
  expect(identity.lastName).toBe(sharedAddress.lastName);
  expect(identity.deliveryAddresses.length).toBeGreaterThanOrEqual(1);
  expect(identity.deliveryAddresses).toHaveLength(2);
  expect(identity.uniqueAddressCount).toBe(1);

  const registered = await Actions.registerCustomer(
    request,
    guestToken,
    who,
    identity.firstName,
    identity.lastName,
  );
  expect(registered.status()).toBe(200);
  const session = requireSession(await Actions.signIn(request, who), who.email);
  // Browser account flow writes each deduplicated address; API performs same surviving write directly.
  await expectStatus(
    Actions.saveAddress(
      request,
      session.accessToken,
      session.customerId,
      identity.deliveryAddresses[0] ?? sharedAddress,
    ),
  );
  const customerResponse = await Actions.getCustomer(
    request,
    session.accessToken,
    session.customerId,
  );
  expect(customerResponse.status()).toBe(200);
  const saved = savedAddressesFrom((await customerResponse.json()) as Customer);

  // Replaces browser request-count polling and address-book rendering with persisted address count.
  expect(saved).toHaveLength(identity.uniqueAddressCount);
  expect(hasAddress(saved, sharedAddress)).toBe(true);
});
