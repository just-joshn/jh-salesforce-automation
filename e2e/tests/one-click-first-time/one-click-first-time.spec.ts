import { readAppConfiguration } from '../../../api/support/app-config';
import {
  evaluateOneClickCheckoutGate,
  evaluatePasswordlessLoginGate,
  formatGateSkipReason,
} from '../../../api/support/gates';
import {
  findOrderableVariant,
  findOrderableVariantWithVariationValues,
} from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import { buildPath } from '../../support/site';
import * as Actions from './one-click-first-time.actions';
import {
  createFirstTimeShopper,
  otpMailboxSkipReason,
  paymentCard,
  shippingAddress,
  toJourneyProduct,
} from './one-click-first-time.data';
import * as Locators from './one-click-first-time.locators';

// OTP entry also remains unprovable on a configured storefront without a readable mailbox.
// Out of scope: registration-transition and saved-payment persistence failures cannot be forced
// against the live shared services without faking the system under test.
test('CUJ 5 — creates registered customer state and completes a One Click purchase', async ({
  page,
  request,
}) => {
  const app = await readAppConfiguration(request);
  const oneClickGate = evaluateOneClickCheckoutGate(app);
  const passwordlessGate = evaluatePasswordlessLoginGate(app);
  const gate = {
    met: oneClickGate.met && passwordlessGate.met,
    missing: [...oneClickGate.missing, ...passwordlessGate.missing],
  };

  if (!gate.met) {
    test.skip(true, formatGateSkipReason(gate));
    return;
  }

  const token = await getGuestToken(request);
  await findOrderableVariant(request, token.access_token);
  const product = toJourneyProduct(
    await findOrderableVariantWithVariationValues(request, token.access_token),
  );
  const shopper = createFirstTimeShopper();

  await test.step('Enter/verify identity', async () => {
    await Actions.visitProduct(page, product);
    await Actions.addProductToBasket(page);
    await Actions.openBasket(page);
    await Actions.startCheckout(page);
    await Actions.requestOtp(page, shopper.email);
    await expect(Locators.otpInputs(page)).toHaveCount(app.login?.tokenLength ?? 0);
    test.skip(true, otpMailboxSkipReason);
  });

  await test.step('Establish customer/account state', async () => {
    await expect(Locators.authenticatedAccountMenu(page)).toBeVisible();
  });

  await test.step('Supply shipping details', async () => {
    await Actions.provideShipping(page, shippingAddress);
    await expect(Locators.cardNumberInput(page)).toBeVisible();
  });

  await test.step('Supply/save payment', async () => {
    await Actions.providePayment(page, paymentCard);
    await Actions.savePaymentAndReviewOrder(page);
    await expect(Locators.savePaymentCheckbox(page)).toBeChecked();
  });

  await test.step('Create order', async () => {
    await Actions.placeOrder(page);
    await expect(page).toHaveURL(buildPath('/checkout/confirmation/*'));
  });

  await test.step('Receive confirmation', async () => {
    await expect(Locators.confirmationHeading(page)).toBeVisible();
  });
});

test('CUJ 5 — separates account creation from order completion when One Click is not configured', async ({
  page,
  request,
}) => {
  const token = await getGuestToken(request);
  await findOrderableVariant(request, token.access_token);
  const product = toJourneyProduct(
    await findOrderableVariantWithVariationValues(request, token.access_token),
  );
  const shopper = createFirstTimeShopper();

  await test.step('Establish customer/account state', async () => {
    await Actions.visitProduct(page, product);
    await Actions.createAccount(page, shopper);
    await expect(Locators.authenticatedAccountMenu(page)).toBeVisible();
    await expect(Locators.accountHeading(page)).toBeVisible();
  });

  await test.step('Reach payment-ready checkout without submitting an order', async () => {
    await Actions.visitProduct(page, product);
    await expect(Locators.productHeading(page, product.productName)).toBeVisible();
    await Actions.addProductToBasket(page);
    await Actions.openBasket(page);
    await expect(Locators.cartProduct(page, product.productName)).toBeVisible();
    await Actions.startCheckout(page);
    await Actions.provideShipping(page, shippingAddress);
    await expect(Locators.cardNumberInput(page)).toBeVisible();
    await expect(Locators.oneClickEntry(page)).toHaveCount(0);
  });
});
