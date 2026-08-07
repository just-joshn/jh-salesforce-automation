import { expect, test } from '@playwright/test';
import { required } from '../../support/scapi';
import type { Basket, Customer, CustomerOrderResult, Order } from '../../support/scapi-types';
import { getGuestToken, loginRegisteredShopper, requireSession } from '../../support/slas';
import * as Actions from './purchase-fulfillment.actions';
import {
  basketBillingAddress,
  basketCustomerEmail,
  basketCustomerId,
  basketItems,
  basketLineFor,
  basketLinesOnShipment,
  basketShippingAddress,
  basketShippingMethodId,
  basketShipmentById,
  basketShipments,
  basketStoreId,
  basketTotal,
  card,
  deliveryMethodId,
  deliveryShipmentId,
  deliveryVariant,
  firstOrderLineOnShipment,
  historyOrderByNumber,
  historyOrderCustomerId,
  historyOrders,
  homeAddress,
  newShopperCredentials,
  orderCustomerEmail,
  orderCustomerId,
  orderItems,
  orderLinesOnShipment,
  orderNumber,
  orderShippingAddress,
  orderShippingMethodId,
  orderShipmentById,
  orderShipments,
  orderStoreId,
  pickupMethodId,
  pickupSelection,
  placedStatuses,
  savedAddressFrom,
  secondAddress,
  secondDeliveryShipmentId,
  shippedLineQuantity,
  shippingAddressFrom,
  shopperEmail,
  singleQuantity,
  twoDeliveryVariants,
} from './purchase-fulfillment.data';

test('a guest buys a shipped item and reaches order confirmation', async ({ request }) => {
  test.setTimeout(180000);
  const variant = await deliveryVariant(request);
  const { accessToken } = await getGuestToken(request);

  // Replaces opening the product page and choosing its color and size: the shared
  // browser resolver selected this exact UI-orderable variant at run time.
  const createResponse = await Actions.createBasket(request, accessToken);
  expect(createResponse.status()).toBe(200);
  const basketId = required(((await createResponse.json()) as Basket).basketId, 'basketId');

  const addResponse = await Actions.addItem(
    request,
    accessToken,
    basketId,
    variant.variantId,
    singleQuantity,
  );
  expect(addResponse.status()).toBe(200);

  const cartResponse = await Actions.getBasket(request, accessToken, basketId);
  expect(cartResponse.status()).toBe(200);
  const cart = (await cartResponse.json()) as Basket;

  // Replaces cart heading, line visibility, delivery-group label, and fulfillment
  // picker assertions: one delivery shipment owns the one resolved line.
  expect(basketItems(cart)).toHaveLength(1);
  expect(basketShipments(cart)).toHaveLength(1);
  expect(basketLineFor(cart, variant.variantId).quantity).toBe(singleQuantity);
  expect(basketLineFor(cart, variant.variantId).shipmentId).toBe(deliveryShipmentId);
  expect(basketLinesOnShipment(cart, deliveryShipmentId)).toHaveLength(1);
  expect(basketStoreId(basketShipmentById(cart, deliveryShipmentId))).toBeUndefined();

  // Replaces proceeding to /checkout and rendering checkout: checkout's first
  // write accepts the guest contact and returns it on the basket.
  const contactResponse = await Actions.setCustomer(request, accessToken, basketId, shopperEmail);
  expect(contactResponse.status()).toBe(200);
  expect(basketCustomerEmail((await contactResponse.json()) as Basket)).toBe(shopperEmail);

  const addressResponse = await Actions.setShippingAddress(
    request,
    accessToken,
    basketId,
    deliveryShipmentId,
    homeAddress,
  );
  expect(addressResponse.status()).toBe(200);
  expect(
    basketShippingAddress((await addressResponse.json()) as Basket, deliveryShipmentId).address1,
  ).toBe(homeAddress.address1);

  const methodResponse = await Actions.setShippingMethod(
    request,
    accessToken,
    basketId,
    deliveryShipmentId,
    deliveryMethodId,
  );
  expect(methodResponse.status()).toBe(200);

  // Replaces the first shipping-method radio being pre-checked: the basket
  // already carries the method the shopper confirms.
  expect(basketShippingMethodId((await methodResponse.json()) as Basket, deliveryShipmentId)).toBe(
    deliveryMethodId,
  );

  // Replaces "Same as shipping address" being checked.
  const billingResponse = await Actions.setBillingAddress(
    request,
    accessToken,
    basketId,
    homeAddress,
  );
  expect(billingResponse.status()).toBe(200);
  expect(basketBillingAddress((await billingResponse.json()) as Basket).address1).toBe(
    homeAddress.address1,
  );

  const pricedResponse = await Actions.getBasket(request, accessToken, basketId);
  expect(pricedResponse.status()).toBe(200);
  const amount = basketTotal((await pricedResponse.json()) as Basket);

  const paymentResponse = await Actions.addPayment(request, accessToken, basketId, card, amount);
  expect(paymentResponse.status()).toBe(200);

  // Review screen has no separate SCAPI operation; the fully prepared basket is
  // submitted directly, replacing Review Order and Place Order clicks.
  const orderResponse = await Actions.createOrder(request, accessToken, basketId);
  expect(orderResponse.status()).toBe(200);
  const order = (await orderResponse.json()) as Order;

  // Replaces confirmation URL, thank-you heading, and rendered summary with the
  // confirmation facts on Shopper Orders' response itself.
  expect(orderNumber(order)).toBeTruthy();
  expect(placedStatuses).toContain(order.status);
  expect(orderItems(order).some((item) => item.productId === variant.variantId)).toBe(true);
  expect(orderShippingAddress(order, deliveryShipmentId).address1).toBe(homeAddress.address1);
});

test('a registered shopper buys with a saved address and finds the order in their history', async ({
  request,
}) => {
  test.setTimeout(240000);
  const credentials = newShopperCredentials();
  const { accessToken: guestToken } = await getGuestToken(request);

  const registrationResponse = await Actions.registerCustomer(request, guestToken, credentials);
  expect(registrationResponse.status()).toBe(200);

  // Replaces the browser sign-in and /account arrival with SLAS' authenticated
  // session for the same newly registered credentials.
  const login = await loginRegisteredShopper(request, credentials.email, credentials.password);
  expect(login.loginStatus).toBe(303);
  const session = requireSession(login, credentials.email);

  const saveResponse = await Actions.saveAddress(request, session.accessToken, session.customerId);
  expect(saveResponse.status()).toBe(200);

  const customerResponse = await Actions.readCustomer(
    request,
    session.accessToken,
    session.customerId,
  );
  expect(customerResponse.status()).toBe(200);
  const customer = (await customerResponse.json()) as Customer;
  const savedAddress = savedAddressFrom(customer);
  expect(customer.customerId).toBe(session.customerId);
  expect(customer.authType).toBe('registered');
  expect(customer.email).toBe(credentials.email);
  expect(savedAddress.preferred).toBe(true);
  expect(savedAddress.address1).toBe(homeAddress.address1);

  const variant = await deliveryVariant(request);
  const createResponse = await Actions.createBasket(request, session.accessToken);
  expect(createResponse.status()).toBe(200);
  const basketId = required(((await createResponse.json()) as Basket).basketId, 'basketId');

  const addResponse = await Actions.addItem(
    request,
    session.accessToken,
    basketId,
    variant.variantId,
    singleQuantity,
  );
  expect(addResponse.status()).toBe(200);
  expect(basketLineFor((await addResponse.json()) as Basket, variant.variantId).productId).toBe(
    variant.variantId,
  );

  const contactResponse = await Actions.setCustomer(
    request,
    session.accessToken,
    basketId,
    credentials.email,
  );
  expect(contactResponse.status()).toBe(200);
  const atCheckout = (await contactResponse.json()) as Basket;

  // Replaces Sign Out visibility and the filled contact card: the basket belongs
  // to this registered session and carries its email.
  expect(basketCustomerId(atCheckout)).toBe(session.customerId);
  expect(basketCustomerEmail(atCheckout)).toBe(credentials.email);

  // Replaces the preferred saved-address card being checked. Shipping uses the
  // address read back from this customer's address book, not a fresh fixture.
  const shippingAddress = shippingAddressFrom(savedAddress);
  const addressResponse = await Actions.setShippingAddress(
    request,
    session.accessToken,
    basketId,
    deliveryShipmentId,
    shippingAddress,
  );
  expect(addressResponse.status()).toBe(200);
  expect(
    basketShippingAddress((await addressResponse.json()) as Basket, deliveryShipmentId).address1,
  ).toBe(savedAddress.address1);

  const methodResponse = await Actions.setShippingMethod(
    request,
    session.accessToken,
    basketId,
    deliveryShipmentId,
    deliveryMethodId,
  );
  expect(methodResponse.status()).toBe(200);

  // Replaces the checked default shipping-method radio.
  expect(basketShippingMethodId((await methodResponse.json()) as Basket, deliveryShipmentId)).toBe(
    deliveryMethodId,
  );

  const billingResponse = await Actions.setBillingAddress(
    request,
    session.accessToken,
    basketId,
    shippingAddress,
  );
  expect(billingResponse.status()).toBe(200);

  const pricedResponse = await Actions.getBasket(request, session.accessToken, basketId);
  expect(pricedResponse.status()).toBe(200);
  const amount = basketTotal((await pricedResponse.json()) as Basket);

  const paymentResponse = await Actions.addPayment(
    request,
    session.accessToken,
    basketId,
    card,
    amount,
  );
  expect(paymentResponse.status()).toBe(200);

  const orderResponse = await Actions.createOrder(request, session.accessToken, basketId);
  expect(orderResponse.status()).toBe(200);
  const order = (await orderResponse.json()) as Order;
  const placedOrderNo = orderNumber(order);
  expect(orderCustomerId(order)).toBe(session.customerId);
  expect(orderCustomerEmail(order)).toBe(credentials.email);
  expect(orderShippingAddress(order, deliveryShipmentId).address1).toBe(homeAddress.address1);

  // Replaces opening /account/orders and finding the rendered order card: Shopper
  // Customers returns the order in this customer's own history.
  const historyResponse = await Actions.getCustomerOrders(
    request,
    session.accessToken,
    session.customerId,
  );
  expect(historyResponse.status()).toBe(200);
  const historyResult = (await historyResponse.json()) as CustomerOrderResult;
  expect(historyOrders(historyResult).length).toBeGreaterThan(0);
  const historyOrder = historyOrderByNumber(historyResult, placedOrderNo);
  expect(historyOrder.orderNo).toBe(placedOrderNo);
  expect(historyOrderCustomerId(historyOrder)).toBe(session.customerId);
});

test('a guest buys an item for store pickup and the confirmation names the store', async ({
  request,
}) => {
  test.setTimeout(240000);
  const { store, product } = await pickupSelection(request);
  const { accessToken } = await getGuestToken(request);

  // Replaces opening the product, choosing its variant, selecting the nearby
  // store, and asserting shelf stock: the shared resolver found this exact
  // variant against this store's inventory at run time.
  expect(store.name).toBeTruthy();
  expect(product.ats).toBeGreaterThan(0);

  const createResponse = await Actions.createBasket(request, accessToken);
  expect(createResponse.status()).toBe(200);
  const basketId = required(((await createResponse.json()) as Basket).basketId, 'basketId');

  const addResponse = await Actions.addItem(
    request,
    accessToken,
    basketId,
    product.variantId,
    singleQuantity,
    { inventoryId: store.inventoryId },
  );
  expect(addResponse.status()).toBe(200);

  const pickupAddressResponse = await Actions.setShippingAddress(
    request,
    accessToken,
    basketId,
    deliveryShipmentId,
    homeAddress,
  );
  expect(pickupAddressResponse.status()).toBe(200);

  const pickupResponse = await Actions.assignPickup(
    request,
    accessToken,
    basketId,
    deliveryShipmentId,
    store.id,
  );
  expect(pickupResponse.status()).toBe(200);

  const cartResponse = await Actions.getBasket(request, accessToken, basketId);
  expect(cartResponse.status()).toBe(200);
  const cart = (await cartResponse.json()) as Basket;

  // Replaces pickup-group, store-name, and fulfillment-picker assertions. The
  // resolved store name maps to the store id and inventory id held by this group.
  expect(basketItems(cart)).toHaveLength(1);
  expect(basketShipments(cart)).toHaveLength(1);
  expect(basketLineFor(cart, product.variantId).inventoryId).toBe(store.inventoryId);
  expect(basketLinesOnShipment(cart, deliveryShipmentId)).toHaveLength(1);
  expect(basketShippingMethodId(cart, deliveryShipmentId)).toBe(pickupMethodId);
  expect(basketStoreId(basketShipmentById(cart, deliveryShipmentId))).toBe(store.id);

  const contactResponse = await Actions.setCustomer(request, accessToken, basketId, shopperEmail);
  expect(contactResponse.status()).toBe(200);

  // Replaces the Pickup Address & Information card naming the store.
  expect(
    basketStoreId(basketShipmentById((await contactResponse.json()) as Basket, deliveryShipmentId)),
  ).toBe(store.id);

  const pricedResponse = await Actions.getBasket(request, accessToken, basketId);
  expect(pricedResponse.status()).toBe(200);
  const amount = basketTotal((await pricedResponse.json()) as Basket);

  const paymentResponse = await Actions.addPayment(request, accessToken, basketId, card, amount);
  expect(paymentResponse.status()).toBe(200);

  const billingResponse = await Actions.setBillingAddress(
    request,
    accessToken,
    basketId,
    homeAddress,
  );
  expect(billingResponse.status()).toBe(200);

  const orderResponse = await Actions.createOrder(request, accessToken, basketId);
  expect(orderResponse.status()).toBe(200);
  const order = (await orderResponse.json()) as Order;
  const shipment = orderShipmentById(order, deliveryShipmentId);

  // Replaces confirmation URL, Pickup Details, Pickup Address, and rendered store
  // name with the placed order's pickup method and resolved store identity.
  expect(orderNumber(order)).toBeTruthy();
  expect(orderShippingMethodId(order, deliveryShipmentId)).toBe(pickupMethodId);
  expect(orderStoreId(shipment)).toBe(store.id);
  expect(orderItems(order).some((item) => item.productId === product.variantId)).toBe(true);
});

test('a guest buys one item for pickup and another for delivery in a single order', async ({
  request,
}) => {
  test.setTimeout(300000);
  const { store, product } = await pickupSelection(request);
  const shipped = await deliveryVariant(request);
  const { accessToken } = await getGuestToken(request);

  const createResponse = await Actions.createBasket(request, accessToken);
  expect(createResponse.status()).toBe(200);
  const basketId = required(((await createResponse.json()) as Basket).basketId, 'basketId');

  // Replaces the first product-page pickup setup. The line uses the selected
  // store's inventory and keeps the browser journey's pickup-first order.
  const pickupAddResponse = await Actions.addItem(
    request,
    accessToken,
    basketId,
    product.variantId,
    singleQuantity,
    { inventoryId: store.inventoryId },
  );
  expect(pickupAddResponse.status()).toBe(200);

  const pickupAddressResponse = await Actions.setShippingAddress(
    request,
    accessToken,
    basketId,
    deliveryShipmentId,
    homeAddress,
  );
  expect(pickupAddressResponse.status()).toBe(200);

  const pickupResponse = await Actions.assignPickup(
    request,
    accessToken,
    basketId,
    deliveryShipmentId,
    store.id,
  );
  expect(pickupResponse.status()).toBe(200);

  const shipmentResponse = await Actions.createShipment(
    request,
    accessToken,
    basketId,
    secondDeliveryShipmentId,
  );
  expect(shipmentResponse.status()).toBe(200);

  // Replaces opening the shipped product and adding it second.
  const deliveryAddResponse = await Actions.addItem(
    request,
    accessToken,
    basketId,
    shipped.variantId,
    shippedLineQuantity,
    { shipmentId: secondDeliveryShipmentId },
  );
  expect(deliveryAddResponse.status()).toBe(200);

  const cartResponse = await Actions.getBasket(request, accessToken, basketId);
  expect(cartResponse.status()).toBe(200);
  const cart = (await cartResponse.json()) as Basket;

  // Replaces cart heading plus pickup and delivery group labels.
  expect(basketItems(cart)).toHaveLength(2);
  expect(basketShipments(cart)).toHaveLength(2);
  expect(basketLinesOnShipment(cart, deliveryShipmentId)).toHaveLength(1);
  expect(basketLinesOnShipment(cart, secondDeliveryShipmentId)).toHaveLength(1);
  expect(basketLineFor(cart, shipped.variantId).quantity).toBe(shippedLineQuantity);
  expect(basketStoreId(basketShipmentById(cart, deliveryShipmentId))).toBe(store.id);

  const contactResponse = await Actions.setCustomer(request, accessToken, basketId, shopperEmail);
  expect(contactResponse.status()).toBe(200);

  // Replaces the pickup card naming the store and the Shipping Address card.
  expect(
    basketStoreId(basketShipmentById((await contactResponse.json()) as Basket, deliveryShipmentId)),
  ).toBe(store.id);

  const addressResponse = await Actions.setShippingAddress(
    request,
    accessToken,
    basketId,
    secondDeliveryShipmentId,
    homeAddress,
  );
  expect(addressResponse.status()).toBe(200);

  const methodResponse = await Actions.setShippingMethod(
    request,
    accessToken,
    basketId,
    secondDeliveryShipmentId,
    deliveryMethodId,
  );
  expect(methodResponse.status()).toBe(200);

  // Replaces "Same as shipping address" being checked for the one payment.
  const billingResponse = await Actions.setBillingAddress(
    request,
    accessToken,
    basketId,
    homeAddress,
  );
  expect(billingResponse.status()).toBe(200);

  const pricedResponse = await Actions.getBasket(request, accessToken, basketId);
  expect(pricedResponse.status()).toBe(200);
  const amount = basketTotal((await pricedResponse.json()) as Basket);

  const paymentResponse = await Actions.addPayment(request, accessToken, basketId, card, amount);
  expect(paymentResponse.status()).toBe(200);

  const orderResponse = await Actions.createOrder(request, accessToken, basketId);
  expect(orderResponse.status()).toBe(200);
  const order = (await orderResponse.json()) as Order;
  const pickupShipment = orderShipmentById(order, deliveryShipmentId);

  // Replaces one confirmation rendering Pickup Details and Delivery Details.
  expect(orderNumber(order)).toBeTruthy();
  expect(orderShipments(order)).toHaveLength(2);
  expect(orderShippingMethodId(order, deliveryShipmentId)).toBe(pickupMethodId);
  expect(orderStoreId(pickupShipment)).toBe(store.id);
  expect(orderShippingMethodId(order, secondDeliveryShipmentId)).toBe(deliveryMethodId);
  expect(orderShippingAddress(order, secondDeliveryShipmentId).address1).toBe(homeAddress.address1);
  expect(firstOrderLineOnShipment(order, deliveryShipmentId).productId).toBe(product.variantId);
  expect(firstOrderLineOnShipment(order, secondDeliveryShipmentId).productId).toBe(
    shipped.variantId,
  );
});

test('a guest sends two items to two different addresses in one order', async ({ request }) => {
  test.setTimeout(420000);
  const [first, second] = await twoDeliveryVariants(request);
  const { accessToken } = await getGuestToken(request);

  const createResponse = await Actions.createBasket(request, accessToken);
  expect(createResponse.status()).toBe(200);
  const basketId = required(((await createResponse.json()) as Basket).basketId, 'basketId');

  const firstAddResponse = await Actions.addItem(
    request,
    accessToken,
    basketId,
    first.variantId,
    singleQuantity,
  );
  expect(firstAddResponse.status()).toBe(200);

  const secondAddResponse = await Actions.addItem(
    request,
    accessToken,
    basketId,
    second.variantId,
    shippedLineQuantity,
  );
  expect(secondAddResponse.status()).toBe(200);

  const initialResponse = await Actions.getBasket(request, accessToken, basketId);
  expect(initialResponse.status()).toBe(200);
  const initial = (await initialResponse.json()) as Basket;

  // Replaces "Delivery - 2 out of 2 items": both product lines begin on the one
  // default shipment and therefore still need splitting.
  expect(basketItems(initial)).toHaveLength(2);
  expect(basketShipments(initial)).toHaveLength(1);
  expect(basketLinesOnShipment(initial, deliveryShipmentId)).toHaveLength(2);
  expect(basketLineFor(initial, first.variantId).quantity).toBe(singleQuantity);
  expect(basketLineFor(initial, second.variantId).quantity).toBe(shippedLineQuantity);

  const contactResponse = await Actions.setCustomer(request, accessToken, basketId, shopperEmail);
  expect(contactResponse.status()).toBe(200);

  // Replaces the visible shipping-address form: checkout accepted the contact and
  // the default shipment is ready to be split by destination.
  expect(
    basketShipmentById((await contactResponse.json()) as Basket, deliveryShipmentId)
      .shippingAddress,
  ).toBeUndefined();

  const shipmentResponse = await Actions.createShipment(
    request,
    accessToken,
    basketId,
    secondDeliveryShipmentId,
  );
  expect(shipmentResponse.status()).toBe(200);

  const secondItemId = required(basketLineFor(initial, second.variantId).itemId, 'itemId');
  const moveResponse = await Actions.moveItem(
    request,
    accessToken,
    basketId,
    secondItemId,
    secondDeliveryShipmentId,
    shippedLineQuantity,
  );
  expect(moveResponse.status()).toBe(200);
  const split = (await moveResponse.json()) as Basket;

  // Replaces two multi-shipping cards, one for each product.
  expect(basketShipments(split)).toHaveLength(2);
  expect(basketLinesOnShipment(split, deliveryShipmentId)).toHaveLength(1);
  expect(basketLinesOnShipment(split, secondDeliveryShipmentId)).toHaveLength(1);
  expect(basketLineFor(split, first.variantId).shipmentId).toBe(deliveryShipmentId);
  expect(basketLineFor(split, second.variantId).shipmentId).toBe(secondDeliveryShipmentId);

  const firstAddressResponse = await Actions.setShippingAddress(
    request,
    accessToken,
    basketId,
    deliveryShipmentId,
    homeAddress,
  );
  expect(firstAddressResponse.status()).toBe(200);

  const secondAddressResponse = await Actions.setShippingAddress(
    request,
    accessToken,
    basketId,
    secondDeliveryShipmentId,
    secondAddress,
  );
  expect(secondAddressResponse.status()).toBe(200);
  const addressed = (await secondAddressResponse.json()) as Basket;

  // Replaces each product card's selected-address option.
  expect(basketShippingAddress(addressed, deliveryShipmentId).address1).toBe(homeAddress.address1);
  expect(basketShippingAddress(addressed, secondDeliveryShipmentId).address1).toBe(
    secondAddress.address1,
  );

  const firstMethodResponse = await Actions.setShippingMethod(
    request,
    accessToken,
    basketId,
    deliveryShipmentId,
    deliveryMethodId,
  );
  expect(firstMethodResponse.status()).toBe(200);

  const secondMethodResponse = await Actions.setShippingMethod(
    request,
    accessToken,
    basketId,
    secondDeliveryShipmentId,
    deliveryMethodId,
  );
  expect(secondMethodResponse.status()).toBe(200);
  const shipped = (await secondMethodResponse.json()) as Basket;

  // Replaces shipping-method headings named for both recipients.
  expect(basketShippingMethodId(shipped, deliveryShipmentId)).toBe(deliveryMethodId);
  expect(basketShippingMethodId(shipped, secondDeliveryShipmentId)).toBe(deliveryMethodId);
  expect(basketShippingAddress(shipped, deliveryShipmentId).firstName).toBe(homeAddress.firstName);
  expect(basketShippingAddress(shipped, secondDeliveryShipmentId).firstName).toBe(
    secondAddress.firstName,
  );

  const billingResponse = await Actions.setBillingAddress(
    request,
    accessToken,
    basketId,
    homeAddress,
  );
  expect(billingResponse.status()).toBe(200);

  const pricedResponse = await Actions.getBasket(request, accessToken, basketId);
  expect(pricedResponse.status()).toBe(200);
  const amount = basketTotal((await pricedResponse.json()) as Basket);

  const paymentResponse = await Actions.addPayment(request, accessToken, basketId, card, amount);
  expect(paymentResponse.status()).toBe(200);

  const orderResponse = await Actions.createOrder(request, accessToken, basketId);
  expect(orderResponse.status()).toBe(200);
  const order = (await orderResponse.json()) as Order;

  // Replaces Delivery 1, Delivery 2, absent Delivery 3, and both rendered
  // destinations. Exactly two non-empty shipments preserve the negative check.
  expect(orderNumber(order)).toBeTruthy();
  expect(orderShipments(order)).toHaveLength(2);
  expect(orderLinesOnShipment(order, deliveryShipmentId)).toHaveLength(1);
  expect(orderLinesOnShipment(order, secondDeliveryShipmentId)).toHaveLength(1);
  expect(orderShippingAddress(order, deliveryShipmentId).address1).toBe(homeAddress.address1);
  expect(orderShippingAddress(order, secondDeliveryShipmentId).address1).toBe(
    secondAddress.address1,
  );
});
