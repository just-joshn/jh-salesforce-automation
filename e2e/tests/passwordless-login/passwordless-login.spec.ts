import { readAppConfiguration } from '../../../api/support/app-config';
import { evaluatePasswordlessLoginGate, formatGateSkipReason } from '../../../api/support/gates';
import { getGuestToken } from '../../../api/support/slas';
import { findOrderableVariant } from '../../../api/support/products';
import { expect, test } from '../../support/fixtures';
import { buildPath } from '../../support/site';
import * as Actions from './passwordless-login.actions';
import {
  createPasswordlessLoginRequest,
  externalTokenSkipReason,
  toGuestBasketProduct,
} from './passwordless-login.data';
import * as Locators from './passwordless-login.locators';

// Out of scope: Step 2 "Token not received" and Step 3 "Token invalid/expired" require control
// of the external delivery channel, which this suite does not have.
test('CUJ 11 — accepts a passwordless login request for a guest shopper with a basket', async ({
  page,
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = evaluatePasswordlessLoginGate(app);
  test.skip(!gate.met, formatGateSkipReason(gate));
  const guestToken = await getGuestToken(request);
  const product = toGuestBasketProduct(
    await findOrderableVariant(request, guestToken.access_token),
  );
  const passwordlessRequest = createPasswordlessLoginRequest();

  await test.step('Request passwordless login', async () => {
    await Actions.buildGuestBasket(page, product);
    await expect(Locators.cartProduct(page, product.productName)).toBeVisible();
    await Actions.requestPasswordlessLogin(page, passwordlessRequest);
  });

  await test.step('Receive OTP/token', async () => {
    await expect(Locators.codeSentHeading(page)).toBeVisible();
    await expect(Locators.codeSentInstructions(page)).toBeVisible();
    await expect(Locators.resendCodeButton(page)).toBeVisible();
  });
});

test('CUJ 11 — preserves the guest basket while the passwordless request is in flight', async ({
  page,
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = evaluatePasswordlessLoginGate(app);
  test.skip(!gate.met, formatGateSkipReason(gate));
  const guestToken = await getGuestToken(request);
  const product = toGuestBasketProduct(
    await findOrderableVariant(request, guestToken.access_token),
  );
  const passwordlessRequest = createPasswordlessLoginRequest();

  await test.step('Request passwordless login', async () => {
    await Actions.buildGuestBasket(page, product);
    await expect(Locators.cartProduct(page, product.productName)).toBeVisible();
    await Actions.requestPasswordlessLogin(page, passwordlessRequest);
    await expect(Locators.codeSentHeading(page)).toBeVisible();
  });

  await test.step('Merge/transfer basket', async () => {
    await Actions.closeCodeDialog(page);
    await Actions.openCart(page);
  });

  await test.step('Resume storefront journey', async () => {
    await expect(Locators.cartProduct(page, product.productName)).toBeVisible();
  });
});

test('CUJ 11 — verifies the emailed token and resumes with the basket intact', async ({
  page,
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = evaluatePasswordlessLoginGate(app);
  const landingPath = gate.landingPath;
  const tokenLength = app.login?.tokenLength;
  test.skip(true, externalTokenSkipReason(gate.mode, tokenLength, landingPath));
  if (landingPath === undefined || tokenLength === undefined) {
    throw new Error(
      'Passwordless token verification requires observed landingPath and tokenLength',
    );
  }
  const guestToken = await getGuestToken(request);
  const product = toGuestBasketProduct(
    await findOrderableVariant(request, guestToken.access_token),
  );
  const passwordlessRequest = createPasswordlessLoginRequest();
  const deliveredToken = process.env.E2E_PASSWORDLESS_TOKEN;
  if (deliveredToken === undefined) {
    throw new Error(
      'Passwordless token verification requires a token delivered to an external mailbox',
    );
  }

  await Actions.buildGuestBasket(page, product);
  await Actions.requestPasswordlessLogin(page, passwordlessRequest);

  await test.step('Verify token', async () => {
    await expect(Locators.codeInputs(page)).toHaveCount(tokenLength);
    await Actions.openPasswordlessLanding(page, landingPath);
    await expect(page).toHaveURL(buildPath(landingPath));
    await Actions.enterPasswordlessToken(page, deliveredToken);
    await expect(Locators.authenticatedAccountMenu(page)).toBeVisible();
  });

  await test.step('Merge/transfer basket', async () => {
    await Actions.openCart(page);
  });

  await test.step('Resume storefront journey', async () => {
    await expect(Locators.cartProduct(page, product.productName)).toBeVisible();
  });
});
