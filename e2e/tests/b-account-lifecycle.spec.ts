import type { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { readAppConfig } from '../support/app-config';
import { resolveTarget } from '../../support/targets';
import { AccountPage } from '../support/pages/account.page';
import { placeSignedInOrder } from '../support/workflows';
import {
  ALTERNATE_PASSWORD,
  PRIMARY_ADDRESS,
  uniqueEmail,
  rejectedEmail,
  VALID_PASSWORD,
} from '../support/test-data';

const target = resolveTarget();

// A guest customer session can bootstrap its own POST /customers on page load, ahead of
// the registration form's own submission — match on the submitted email specifically so
// this doesn't resolve on that unrelated request.
function customersEndpointResponse(page: Page, email: string) {
  return page.waitForResponse((res) => {
    if (!res.url().includes('/customers') || res.request().method() !== 'POST') {
      return false;
    }
    return (res.request().postData() ?? '').includes(email);
  });
}

test.describe('B. Account Lifecycle', { tag: '@account' }, () => {
  test(
    'B1 - Register a new account',
    { tag: ['@critical', '@destructive', '@nightly'] },
    async ({ page, registerPage }) => {
      const badEmail = rejectedEmail('reg-invalid');
      await test.step('An email the platform rejects keeps the shopper on the form with an inline error', async () => {
        const response = customersEndpointResponse(page, badEmail);
        await registerPage.register({
          firstName: 'Cuj',
          lastName: 'Discovery',
          email: badEmail,
          password: VALID_PASSWORD,
        });
        expect((await response).status()).toBe(400);
        await registerPage.expectRejected();
      });

      const goodEmail = uniqueEmail('reg-valid');
      await test.step('A deliverable-looking email succeeds and lands on an authenticated /account', async () => {
        const response = customersEndpointResponse(page, goodEmail);
        await registerPage.submit({
          firstName: 'Cuj',
          lastName: 'Discovery',
          email: goodEmail,
          password: VALID_PASSWORD,
        });
        expect((await response).status()).toBe(200);
        await registerPage.expectAccountCreated();
      });
    },
  );

  test(
    'B2 - Sign in with password (valid and invalid)',
    { tag: ['@critical', '@destructive', '@nightly'] },
    async ({ page, registerPage, loginPage }) => {
      const email = uniqueEmail('login');
      await registerPage.register({
        firstName: 'Cuj',
        lastName: 'Login',
        email,
        password: VALID_PASSWORD,
      });
      await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
      await new AccountPage(page).logout();

      await test.step('Wrong credentials show an inline alert and do not redirect', async () => {
        await loginPage.loginWithPassword(email, 'DefinitelyWrongPassword!1');
        await loginPage.expectInvalidCredentialsError();
        await expect(page).toHaveURL(/\/login/);
      });

      await test.step('Correct credentials redirect to /account', async () => {
        await loginPage.loginWithPassword(email, VALID_PASSWORD);
        await expect(page).toHaveURL(/\/account$/);
        await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
      });
    },
  );

  test(
    'B3 - Passwordless (email one-time code) login',
    { tag: ['@boundary', '@nightly'] },
    async ({ page, loginPage }, testInfo) => {
      await page.goto('/');
      const config = await readAppConfig(page);
      expect(config.login.passwordless.enabled).toBe(true);
      expect(config.login.passwordless.mode).toBe('email');

      await loginPage.requestPasswordlessCode(uniqueEmail('otp'));
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText(/confirm it.s you/i)).toBeVisible();

      const codeBoxes = dialog.getByRole('textbox');
      await expect(codeBoxes.first()).toBeVisible();
      const codeLength = await codeBoxes.count();
      expect(codeLength, 'passwordless code input count').toBeGreaterThan(0);

      const tokenResponse = page.waitForResponse((res) =>
        res.url().includes('oauth2/passwordless/token'),
      );
      for (let i = 0; i < codeLength; i += 1) {
        await codeBoxes.nth(i).fill(String((i + 1) % 10));
      }
      expect((await tokenResponse).status()).toBe(401);
      await expect(codeBoxes.first()).toBeEditable();

      testInfo.annotations.push({
        type: 'boundary',
        description:
          'Success path (a real emailed code matching the rendered input count) needs live inbox access ' +
          'pass does not have — see docs/cross-service-critical-user-journeys.md B3.',
      });
    },
  );

  test(
    'B4 - Social login (Google / Apple)',
    { tag: ['@boundary', '@nightly'] },
    async ({ page, loginPage }, testInfo) => {
      await page.goto('/');
      const config = await readAppConfig(page);
      expect(config.login.social.enabled).toBe(true);
      expect(config.login.social.idps).toEqual(expect.arrayContaining(['google', 'apple']));

      for (const idp of ['Google', 'Apple'] as const) {
        // The button navigates the whole page to the authorize URL, whose response body
        // is itself the 403 — not an XHR fired from a page that stays on /login.
        const authorizeResponse = page.waitForResponse((res) =>
          res.url().includes('oauth2/authorize'),
        );
        await loginPage.clickSocialLogin(idp);
        expect((await authorizeResponse).status()).toBe(403);
      }

      testInfo.annotations.push({
        type: 'boundary',
        description:
          'Both IdPs are blocked by the SLAS Private Client Proxy on this shared demo (403) — ' +
          'an infrastructure defect on the public demo, not a feature flag. See B4.',
      });
    },
  );

  test(
    'B5 - Reset a forgotten password (email callback)',
    { tag: ['@boundary', '@nightly'] },
    async ({ page, loginPage, workerAccount }, testInfo) => {
      await page.goto('/');
      const config = await readAppConfig(page);
      expect(config.login.resetPassword.mode).toBe('email');

      // A registered address is required here: unlike registration/checkout's domain-only
      // validation, an address with no matching customer surfaces a generic error instead
      // of the anti-enumeration confirmation copy — so this reuses the worker's own account.
      const resetPasswordPage = await loginPage.goToForgotPassword(uniqueEmail('reset-entry'));
      await resetPasswordPage.expectLoaded();

      const resetResponse = page.waitForResponse(
        (res) => res.request().method() === 'POST' && res.url().includes('oauth2/password/reset'),
      );
      await resetPasswordPage.requestReset(workerAccount.email);
      const response = await resetResponse;
      if (target.name === 'staging') {
        expect(response.status()).toBe(401);
        expect(await response.text()).toContain('no sender email defined');
        await resetPasswordPage.expectServiceError();
      } else {
        expect(response.status()).toBe(200);
        await resetPasswordPage.expectConfirmation();
      }

      testInfo.annotations.push({
        type: 'boundary',
        description:
          target.name === 'staging'
            ? 'Staging has no sender email configured (401); the UI masks this as a generic error.'
            : 'Completing the accepted reset needs the emailed link, outside this automated pass.',
      });
    },
  );

  test(
    'B6 - Self-service password change (signed-in)',
    { tag: ['@destructive', '@nightly'] },
    async ({ workerAccount, accountPage }) => {
      await accountPage.goto();

      await test.step('Change the password and confirm the toast', async () => {
        await accountPage.changePassword(workerAccount.password, ALTERNATE_PASSWORD);
        await accountPage.expectPasswordUpdated();
      });

      // Revert immediately so the shared worker account stays valid for later tests —
      // mirrors the doc's own repeatable-flow verification for B6.
      await test.step('Revert the password, proving the flow is repeatable', async () => {
        await accountPage.changePassword(ALTERNATE_PASSWORD, workerAccount.password);
        await accountPage.expectPasswordUpdated();
      });
    },
  );

  test(
    'B7 - Edit profile details (phone number)',
    { tag: ['@destructive', '@nightly'] },
    async ({ signedInPage: page, accountPage }) => {
      await accountPage.goto();

      const response = await accountPage.updatePhoneNumber('4155550142');
      expect(response.status()).toBe(200);

      await expect(page.getByText('(415) 555-0142')).toBeVisible();
      await page.reload();
      await expect(page.getByText('(415) 555-0142')).toBeVisible();
    },
  );

  test(
    'B8 - Manage saved addresses (add, default, remove)',
    { tag: ['@destructive', '@nightly'] },
    async ({ signedInPage: page, addressBookPage }) => {
      await addressBookPage.clear();
      await addressBookPage.expectEmpty();

      await addressBookPage.add(PRIMARY_ADDRESS, true);
      await expect(page.getByText('Default', { exact: true })).toBeVisible();
      await expect(page.getByText(PRIMARY_ADDRESS.address)).toBeVisible();
      await expect(
        page.getByText(`${PRIMARY_ADDRESS.city}, CA ${PRIMARY_ADDRESS.zip}`),
      ).toBeVisible();

      await addressBookPage.remove(PRIMARY_ADDRESS.address);
      await addressBookPage.expectEmpty();
    },
  );

  test(
    'B9 - View order history and order detail',
    { tag: ['@destructive', '@nightly'] },
    async ({ signedInPage: page, orderHistoryPage }) => {
      const order = await placeSignedInOrder(page);

      const ordersResponse = await orderHistoryPage.goto();
      expect(ordersResponse.status()).toBe(200);

      await orderHistoryPage.expectOrderListed(order.orderNumber);
      await orderHistoryPage.viewDetails();
      await orderHistoryPage.expectDetailUrl(order.orderNumber);
      await expect(page.getByText('Visa')).toBeVisible();
      await orderHistoryPage.expectNotShipped();
    },
  );
});
