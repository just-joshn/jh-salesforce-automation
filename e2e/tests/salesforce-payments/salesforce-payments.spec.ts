/**
 * CUJ 2 Pain Point row 2 is this gate's inverse: unavailable or invalid Salesforce Payments
 * configuration skips the payment-backed flow and is therefore covered by the recorded skip.
 *
 * Out of scope: rows 3 and 5 require PSP-side decline or post-order payment-update failure
 * injection. SCAPI mocking is prohibited, so neither recovery branch is artificially induced.
 */
import { readAppConfiguration } from '../../../api/support/app-config';
import { evaluateSalesforcePaymentsGate, formatGateSkipReason } from '../../../api/support/gates';
import {
  findOrderableVariant,
  findOrderableVariantWithVariationValues,
} from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import * as Actions from './salesforce-payments.actions';
import {
  acceptedSalesforcePaymentsInput,
  createCheckoutInput,
  isBundleOrSet,
  selectProduct,
} from './salesforce-payments.data';
import * as Locators from './salesforce-payments.locators';

test('CUJ 2 — completes a payment-backed checkout through Salesforce Payments', async ({
  page,
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = await evaluateSalesforcePaymentsGate(app, request);
  test.skip(!gate.met, formatGateSkipReason(gate));

  const token = await getGuestToken(request);
  const initialCandidate = await findOrderableVariant(request, token.access_token);
  const product = selectProduct(
    isBundleOrSet(initialCandidate.productName)
      ? await findOrderableVariantWithVariationValues(request, token.access_token)
      : initialCandidate,
  );
  const checkout = createCheckoutInput();

  await test.step('Reach payment-ready checkout', async () => {
    await Actions.reachPaymentReadyCheckout(page, product, checkout);
    await expect(Locators.paymentHeading(page)).toBeVisible();
  });

  await test.step('Load/select payment method', async () => {
    await Actions.selectSalesforcePaymentsMethod(page);
    await expect(Locators.salesforcePaymentsMethod(page)).toBeChecked();
  });

  await test.step('Supply/approve payment data', async () => {
    await Actions.supplySalesforcePaymentsData(page, acceptedSalesforcePaymentsInput);
    await expect(Locators.reviewOrderButton(page)).toBeEnabled();
  });

  await test.step('Create Commerce order', async () => {
    await Actions.createCommerceOrder(page);
  });

  await test.step('Attach/confirm payment on order', async () => {
    await Actions.attachAndConfirmPayment(page);
  });

  await test.step('Reach confirmation', async () => {
    await expect(Locators.confirmationHeading(page)).toBeVisible();
  });
});

test('CUJ 2 — completes checkout through the standard payment surface when Salesforce Payments is not configured', async ({
  page,
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = await evaluateSalesforcePaymentsGate(app, request);
  test.skip(gate.met, formatGateSkipReason(gate));

  const token = await getGuestToken(request);
  const initialCandidate = await findOrderableVariant(request, token.access_token);
  const product = selectProduct(
    isBundleOrSet(initialCandidate.productName)
      ? await findOrderableVariantWithVariationValues(request, token.access_token)
      : initialCandidate,
  );
  const checkout = createCheckoutInput();

  await Actions.visitProduct(page, product);
  await expect(Locators.productHeading(page, product.productName)).toBeVisible();
  await expect(Locators.addToCartButton(page)).toBeEnabled();
  await Actions.addProductToBasket(page);
  await expect(Locators.addedToCartHeading(page)).toBeVisible();
  await Actions.startCheckout(page);
  await expect(Locators.checkoutHeading(page)).toBeVisible();
  await Actions.provideContact(page, checkout.email);
  await Actions.provideShipping(page, checkout.shippingAddress);

  await expect(Locators.paymentHeading(page)).toBeVisible();
  await expect(Locators.standardCardNumberInput(page)).toBeVisible();
});
