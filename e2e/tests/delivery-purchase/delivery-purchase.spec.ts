import { findOrderableVariant } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import * as Actions from './delivery-purchase.actions';
import {
  confirmationExpectation,
  createCheckoutInput,
  defaultShippingMethod,
  extractOrderNumber,
  invalidPaymentCard,
} from './delivery-purchase.data';
import * as Locators from './delivery-purchase.locators';

test('CUJ 1 — completes a delivery purchase and receives a confirmed order', async ({
  page,
  request,
}) => {
  const token = await getGuestToken(request);
  const product = await findOrderableVariant(request, token.access_token);
  const checkout = createCheckoutInput();

  await test.step('Find/select purchasable product', async () => {
    await Actions.visitProduct(page, product.productId);
    await expect(Locators.productHeading(page, product.productName)).toBeVisible();
    await expect(Locators.addToCartButton(page)).toBeEnabled();
  });

  await test.step('Add product to basket', async () => {
    await Actions.addProductToBasket(page);
    await expect(Locators.addedToCartHeading(page)).toBeVisible();
  });

  await test.step('Review basket and start checkout', async () => {
    await Actions.reviewBasketAndStartCheckout(page);
    await expect(Locators.checkoutHeading(page)).toBeVisible();
  });

  await test.step('Provide valid contact, address, shipping', async () => {
    await Actions.provideContact(page, checkout.email);
    await Actions.provideShipping(page, checkout.shippingAddress);
    await expect(Locators.editShippingAddressButton(page)).toBeVisible();
    await expect(Locators.shippingMethod(page, defaultShippingMethod)).toBeVisible();
  });

  await test.step('Provide valid payment and place order', async () => {
    await Actions.providePaymentAndPlaceOrder(page, checkout.payment);
    await expect(page).toHaveURL(confirmationExpectation.pathPattern);
  });

  await test.step('Receive order confirmation', async () => {
    await expect(Locators.confirmationHeading(page)).toBeVisible();
    const orderNumberLocator = Locators.orderNumber(page);
    await expect(orderNumberLocator).toHaveText(confirmationExpectation.orderNumberPattern);
    const orderNumber = extractOrderNumber(await orderNumberLocator.innerText());
    test.info().annotations.push({ type: 'orderNo', description: orderNumber });
  });
});

test('CUJ 1 — rejects checkout submission when the shipping address is invalid', async ({
  page,
  request,
}) => {
  const token = await getGuestToken(request);
  const product = await findOrderableVariant(request, token.access_token);
  const checkout = createCheckoutInput();

  await Actions.visitProduct(page, product.productId);
  await Actions.addProductToBasket(page);
  await Actions.reviewBasketAndStartCheckout(page);
  await Actions.provideContact(page, checkout.email);
  await Actions.submitEmptyShippingAddress(page);

  await expect(Locators.missingAddressError(page)).toBeVisible();
  await expect(Locators.continueToShippingButton(page)).toBeVisible();
  await expect(Locators.cardNumberInput(page)).not.toBeVisible();
  await expect(page).toHaveURL(/\/checkout$/);
});

test('CUJ 1 — rejects an invalid payment card before order submission', async ({
  page,
  request,
}) => {
  const token = await getGuestToken(request);
  const product = await findOrderableVariant(request, token.access_token);
  const checkout = createCheckoutInput();

  await Actions.reachPayment(page, product.productId, checkout);
  await Actions.reviewPayment(page, invalidPaymentCard);

  await expect(Locators.invalidCardNumberError(page)).toBeVisible();
  await expect(Locators.reviewOrderButton(page)).toBeVisible();
  await expect(Locators.placeOrderButton(page)).not.toBeVisible();
  await expect(page).toHaveURL(/\/checkout$/);
});
