import { expect, test } from '@playwright/test';
import { required } from '../../support/scapi';
import type { Basket, Order, SiteConfiguration } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import * as Actions from './salesforce-payments.actions';
import {
  configurationMap,
  deliveryVariant,
  homeAddress,
  paymentCard,
  paymentsAllowed,
  salesforcePaymentsCondition,
  salesforcePaymentsUrls,
  shipmentId,
  shippingMethodId,
  shopperEmail,
} from './salesforce-payments.data';

// CUJ 19 — Complete purchase through Salesforce Payments.
test('a shopper pays through Salesforce Payments and one order is created', async ({ request }) => {
  test.setTimeout(300000);

  const condition = await salesforcePaymentsCondition(request);
  test.skip(!condition.met, condition.reason);

  const { sdkUrl, metadataUrl } = await salesforcePaymentsUrls(request);
  const variant = await deliveryVariant(request);
  const { accessToken } = await getGuestToken(request);

  const configurationResponse = await Actions.getConfigurations(request, accessToken);
  expect(configurationResponse.status()).toBe(200);
  const configurations = configurationMap(
    (await configurationResponse.json()) as SiteConfiguration,
  );
  expect(configurations.get(paymentsAllowed)).toBe(true);

  // Replaces e2e configured SDK bundle response assertion; API proves configured URL is served.
  const sdkResponse = await Actions.getConfiguredAsset(request, accessToken, sdkUrl);
  expect(sdkResponse.ok()).toBeTruthy();
  // Replaces e2e payment-metadata request assertion; API proves configured metadata URL is served.
  const metadataResponse = await Actions.getConfiguredAsset(request, accessToken, metadataUrl);
  expect(metadataResponse.ok()).toBeTruthy();

  // Replaces e2e PDP express-checkout placement assertion: SDK-mounted button is browser-only.

  const createResponse = await Actions.createBasket(request, accessToken);
  expect(createResponse.status()).toBe(200);
  const basketId = required(((await createResponse.json()) as Basket).basketId, 'basketId');
  const addResponse = await Actions.addItem(request, accessToken, basketId, variant.variantId);
  expect(addResponse.status()).toBe(200);

  // Replaces e2e mini-cart express-checkout placement assertion: SDK-mounted button is browser-only.
  // Replaces e2e cart express-checkout placement assertion: SDK-mounted button is browser-only.

  expect((await Actions.setCustomer(request, accessToken, basketId, shopperEmail)).status()).toBe(
    200,
  );
  expect(
    (
      await Actions.setShippingAddress(request, accessToken, basketId, shipmentId, homeAddress)
    ).status(),
  ).toBe(200);
  expect(
    (
      await Actions.setShippingMethod(request, accessToken, basketId, shipmentId, shippingMethodId)
    ).status(),
  ).toBe(200);
  expect(
    (await Actions.setBillingAddress(request, accessToken, basketId, homeAddress)).status(),
  ).toBe(200);

  // Replaces e2e checkout express-checkout placement assertion: SDK-mounted button is browser-only.
  // Replaces e2e payment-step visibility and attached payment-sheet iframe assertions: both are
  // browser surfaces mounted by Salesforce Payments SDK, with no shopper-facing payment API.

  const pricedResponse = await Actions.getBasket(request, accessToken, basketId);
  expect(pricedResponse.status()).toBe(200);
  const amount = required(((await pricedResponse.json()) as Basket).orderTotal, 'orderTotal');
  expect(
    (await Actions.addPayment(request, accessToken, basketId, paymentCard, amount)).status(),
  ).toBe(200);

  let createdOrders = 0;
  const orderResponse = await Actions.createOrder(request, accessToken, basketId);
  if (orderResponse.ok()) createdOrders += 1;
  expect(orderResponse.status()).toBe(200);
  const order = (await orderResponse.json()) as Order;
  expect(order.orderNo).toBeTruthy();

  // Replaces provider processing-route and confirmation-page assertions with Commerce outcomes.
  const consumedResponse = await Actions.getBasket(request, accessToken, basketId);
  expect(consumedResponse.status()).toBe(404);
  const duplicateResponse = await Actions.createOrder(request, accessToken, basketId);
  if (duplicateResponse.ok()) createdOrders += 1;
  expect(duplicateResponse.ok()).toBe(false);
  expect(createdOrders).toBe(1);
});
