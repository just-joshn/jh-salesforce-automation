import { expect, test } from '../../support/fixtures';
import * as Actions from './identity-account.actions';
import {
  accountUrlPattern,
  changedPassword,
  maskedPassword,
  newCredentials,
  orderableVariant,
  provisionCustomer,
  provisionedName,
  registrant,
  tryPasswordLogin,
  uniqueEmail,
} from './identity-account.data';
import * as Locators from './identity-account.locators';

// CUJ 5: Create shopper account: register, authenticate the new credentials,
// and land in a registered session with the account area reachable.
test('create a shopper account and reach the account area', async ({ page }) => {
  test.setTimeout(60000);

  await Actions.openRegistration(page);
  await Actions.register(page, registrant(uniqueEmail()));

  // Log Out proves the registered session. It may sit in a menu, so it is
  // checked as attached, not visible.
  await expect(page).toHaveURL(accountUrlPattern, { timeout: 20000 });
  await expect(Locators.logout(page).first()).toBeAttached();
  await expect(Locators.profileCard(page)).toBeVisible({ timeout: 20000 });
});

// CUJ 6: Sign in and recover the existing shopping session: authenticate with
// username/password and keep the guest cart contents after the basket merge.
// Passwordless OTP and social IDP variants are not offered by this demo shop.
test('sign in recovers the existing shopping session', async ({ page, request }) => {
  test.setTimeout(120000);
  const credentials = newCredentials();

  await provisionCustomer(request, credentials);
  const variant = await orderableVariant(request);

  await Actions.addProductToCart(page, variant.masterId, variant.sizeName);
  await Actions.openCart(page);
  await expect(Locators.cartItem(page, variant.variantId)).toBeVisible({ timeout: 15000 });

  await Actions.openLogin(page);
  await Actions.signIn(page, credentials);

  await expect(page).toHaveURL(accountUrlPattern, { timeout: 20000 });
  await expect(Locators.logout(page).first()).toBeAttached();

  await Actions.openCart(page);
  await expect(Locators.cartItem(page, variant.variantId)).toBeVisible({ timeout: 15000 });
});

// CUJ 7: Change password without losing the session.
//
// Shopper Customers updates the credential. The old login stops working, and SLAS
// reauthenticates with the new password. The current session stays signed in.
test('change password without losing the session', async ({ page, request }) => {
  test.setTimeout(120000);
  const credentials = newCredentials();

  await provisionCustomer(request, credentials);
  await Actions.openLogin(page);
  await Actions.signIn(page, credentials);

  // Sign-in already landed on the account area. A second goto races the app's
  // hydration and leaves the password form without working handlers.
  //
  // Wait for real customer data, not the loading skeleton. Otherwise the
  // Edit form detaches mid-flow and Save never submits.
  await expect(Locators.profileCard(page)).toContainText(provisionedName, { timeout: 20000 });
  await expect(Locators.passwordCard(page)).toContainText(maskedPassword, { timeout: 20000 });
  await Actions.changePassword(page, credentials, changedPassword);

  // The session survives the credential change.
  await expect(Locators.passwordUpdatedToast(page)).toBeVisible({ timeout: 20000 });
  await expect(page).toHaveURL(accountUrlPattern);
  await expect(Locators.logout(page).first()).toBeAttached();
  await expect(Locators.profileCard(page)).toBeVisible({ timeout: 20000 });

  // Cross-service proof: the old password is dead at SLAS, the new one logs in.
  // SLAS takes a moment to see the change, so poll until it catches up.
  await expect
    .poll(async () => (await tryPasswordLogin(request, credentials)).loginStatus, {
      timeout: 30000,
    })
    .toBe(401);
  await expect
    .poll(
      async () =>
        (await tryPasswordLogin(request, { ...credentials, password: changedPassword }))
          .accessToken !== undefined,
      { timeout: 30000 },
    )
    .toBe(true);
});
