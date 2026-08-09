/**
 * Out of scope: rows 2, 3, and 5 require PSP-side provider authorization, shipping invalidation,
 * or payment/order recovery failure injection. SCAPI mocking is prohibited, so those failures are
 * not artificially induced.
 */
import { readAppConfiguration } from '../../../api/support/app-config';
import {
  evaluateExpressCheckoutGate,
  formatGateSkipReason,
} from '../../../api/support/gates';
import {
  findOrderableVariant,
  findOrderableVariantWithVariationValues,
} from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import * as Actions from './express-checkout.actions';
import { isBundleOrSet, selectProduct } from './express-checkout.data';
import * as Locators from './express-checkout.locators';

test('CUJ 3 — completes a purchase through Express Checkout', async ({ page, request }) => {
  const app = await readAppConfiguration(request);
  const gate = await evaluateExpressCheckoutGate(app, request);
  test.skip(!gate.met, formatGateSkipReason(gate));

  const token = await getGuestToken(request);
  const initialCandidate = await findOrderableVariant(request, token.access_token);
  const product = selectProduct(
    isBundleOrSet(initialCandidate.productName)
      ? await findOrderableVariantWithVariationValues(request, token.access_token)
      : initialCandidate,
  );

  await test.step('Invoke express payment', async () => {
    await Actions.visitProduct(page, product);
    await Actions.invokeExpressPayment(page);
  });

  await test.step('Authorize with provider', async () => {
    await Actions.authorizeWithProvider(page);
  });

  await test.step('Prepare basket/address/shipping', async () => {
    await Actions.prepareBasketAddressAndShipping(page);
  });

  await test.step('Create order', async () => {
    await Actions.createOrder(page);
  });

  await test.step('Process/confirm payment', async () => {
    await Actions.processAndConfirmPayment(page);
  });

  await test.step('Reach confirmation', async () => {
    await expect(Locators.confirmationHeading(page)).toBeVisible();
  });
});

test(
  'CUJ 3 — offers no express payment entry point on any surface when express payment is not configured',
  async ({ page, request }) => {
    const app = await readAppConfiguration(request);
    const gate = await evaluateExpressCheckoutGate(app, request);
    test.skip(gate.met, formatGateSkipReason(gate));

    const token = await getGuestToken(request);
    const initialCandidate = await findOrderableVariant(request, token.access_token);
    const product = selectProduct(
      isBundleOrSet(initialCandidate.productName)
        ? await findOrderableVariantWithVariationValues(request, token.access_token)
        : initialCandidate,
    );

    await Actions.visitProduct(page, product);
    await expect(Locators.productHeading(page, product.productName)).toBeVisible();
    await expect(Locators.addToCartButton(page)).toBeEnabled();
    await expect(Locators.expressPaymentButton(page)).toHaveCount(0);

    await Actions.addProductToBasket(page);
    await expect(Locators.addedToCartHeading(page)).toBeVisible();
    await Actions.openCart(page);
    await expect(Locators.proceedToCheckoutLink(page)).toBeVisible();
    await expect(Locators.expressPaymentButton(page)).toHaveCount(0);

    await Actions.startCheckout(page);
    await expect(Locators.checkoutHeading(page)).toBeVisible();
    await expect(Locators.emailInput(page)).toBeVisible();
    await expect(Locators.expressPaymentButton(page)).toHaveCount(0);
  },
);
