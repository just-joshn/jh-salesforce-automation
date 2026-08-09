import { readAppConfiguration } from '../../../api/support/app-config';
import { evaluateSocialLoginGate, formatGateSkipReason } from '../../../api/support/gates';
import { findOrderableVariant } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import { buildPath } from '../../support/site';
import * as Actions from './social-login.actions';
import {
  callbackPath,
  externalIdentityProviderSkipReason,
  firstSocialProvider,
  journeyProductFrom,
  matchesAuthorizationUrl,
  socialProviderFor,
} from './social-login.data';
import * as Locators from './social-login.locators';

/*
 * OUT OF SCOPE — CUJ 12 pain-point steps 2, "External IdP rejects/fails", and 3,
 * "Callback state invalid", both live behind an external identity provider that this suite does not control.
 */

test('CUJ 12 — offers every configured identity provider on the login surface', async ({
  page,
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = evaluateSocialLoginGate(app);
  test.skip(!gate.met, formatGateSkipReason(gate));

  await Actions.visitStorefront(page);
  await Actions.openSocialLogin(page);

  for (const idp of gate.idps) {
    await expect(Locators.socialProviderButton(page, socialProviderFor(idp).label)).toBeVisible();
  }
});

test('CUJ 12 — hands a guest shopper with a basket to the chosen identity provider', async ({
  page,
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = evaluateSocialLoginGate(app);
  test.skip(!gate.met, formatGateSkipReason(gate));

  const guest = await getGuestToken(request);
  const variant = await findOrderableVariant(request, guest.access_token);
  const product = journeyProductFrom(variant);
  const provider = firstSocialProvider(gate.idps);

  await Actions.buildGuestBasket(page, product);
  await expect(Locators.cartProduct(page, product.name)).toBeVisible();

  await test.step('Choose social provider', async () => {
    await Actions.openSocialLogin(page);
    await expect(Locators.socialProviderButton(page, provider.label)).toBeVisible();
    await Actions.chooseSocialProvider(page, provider);
  });

  await test.step('Authenticate/authorize', async () => {
    await page.waitForURL((url) => matchesAuthorizationUrl(url, provider));
    await expect.poll(() => new URL(page.url()).hostname).toBe(provider.authorizationHost);
    await expect.poll(() => new URL(page.url()).searchParams.get('hint')).toBe(provider.idp);
  });
});

test('CUJ 12 — returns through the callback with an established session and the basket intact', async ({
  page,
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = evaluateSocialLoginGate(app);
  test.skip(true, externalIdentityProviderSkipReason(gate.idps, gate.redirectURI));

  const guest = await getGuestToken(request);
  const variant = await findOrderableVariant(request, guest.access_token);
  const product = journeyProductFrom(variant);
  const provider = firstSocialProvider(gate.idps);

  await Actions.buildGuestBasket(page, product);
  await Actions.openSocialLogin(page);
  await Actions.chooseSocialProvider(page, provider);

  await test.step('Return through callback', async () => {
    await page.waitForURL(buildPath(callbackPath(gate.redirectURI)));
  });
  await test.step('Establish SLAS session', async () => {
    await expect(Locators.authenticatedAccountMenu(page)).toBeVisible();
  });
  await test.step('Merge basket and return', async () => {
    await Actions.returnToBasket(page);
    await expect(Locators.cartProduct(page, product.name)).toBeVisible();
  });
});
