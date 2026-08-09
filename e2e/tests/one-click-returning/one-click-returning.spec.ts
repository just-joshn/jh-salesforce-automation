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
import * as Actions from './one-click-returning.actions';
import {
  createReturningShopper,
  otpMailboxSkipReason,
  paymentCard,
  shippingAddress,
  toJourneyProduct,
} from './one-click-returning.data';
import * as Locators from './one-click-returning.locators';

// OTP entry also remains unprovable on a configured storefront without a readable mailbox.
// Out of scope: basket-transfer failure and stale saved-data failure cannot be forced against the
// live shared services without faking the system under test.
test('CUJ 4 — authenticates a returning shopper and completes a One Click order', async ({
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
  const shopper = createReturningShopper();

  await test.step('Enter account email/request OTP', async () => {
    await Actions.visitProduct(page, product);
    await Actions.addProductToBasket(page);
    await Actions.openBasket(page);
    await Actions.startCheckout(page);
    await Actions.requestOtp(page, shopper.email);
  });

  await test.step('Verify OTP', async () => {
    await expect(Locators.otpInputs(page)).toHaveCount(app.login?.tokenLength ?? 0);
    test.skip(true, otpMailboxSkipReason);
  });

  await test.step('Transfer/merge basket', async () => {
    await Actions.openBasketFromAccount(page);
    await expect(Locators.cartProduct(page, product.productName)).toBeVisible();
  });

  await test.step('Load/apply saved shipping/payment', async () => {
    await expect(Locators.cardNumberInput(page)).toBeVisible();
  });

  await test.step('Place order', async () => {
    await Actions.provideShipping(page, shippingAddress);
    await Actions.providePayment(page, paymentCard);
    await Actions.placeOrder(page);
  });

  await test.step('Reach confirmation', async () => {
    await expect(page).toHaveURL(buildPath('/checkout/confirmation/*'));
    await expect(Locators.confirmationHeading(page)).toBeVisible();
  });
});

test('CUJ 4 — preserves the guest basket across the identity change', async ({ page, request }) => {
  const token = await getGuestToken(request);
  await findOrderableVariant(request, token.access_token);
  const product = toJourneyProduct(
    await findOrderableVariantWithVariationValues(request, token.access_token),
  );
  const shopper = createReturningShopper();

  await test.step('Build guest basket', async () => {
    await Actions.visitProduct(page, product);
    await expect(Locators.productHeading(page, product.productName)).toBeVisible();
    await Actions.addProductToBasket(page);
    await Actions.openBasket(page);
    await expect(Locators.cartProduct(page, product.productName)).toBeVisible();
  });

  await test.step('Change guest identity to a registered shopper', async () => {
    await Actions.createAccount(page, shopper);
    await expect(Locators.authenticatedAccountMenu(page)).toBeVisible();
  });

  await test.step('Confirm basket survives registered identity', async () => {
    await Actions.openBasketFromAccount(page);
    await expect(Locators.cartProduct(page, product.productName)).toBeVisible();
  });
});
