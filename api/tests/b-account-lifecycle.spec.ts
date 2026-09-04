import { clients, expect, test } from '../support/fixtures';
import { readAppConfig } from '../support/app-config';
import { env } from '../support/env';
import { parseJson } from '../support/response';
import { customerRegistrationSchema, problemDetailSchema } from '../support/schemas';
import {
  ALTERNATE_PASSWORD,
  PRIMARY_ADDRESS,
  PRODUCTS,
  rejectedEmail,
  TEST_VISA,
  uniqueEmail,
  VALID_PASSWORD,
} from '../support/test-data';
import { placeSignedInOrder } from '../support/workflows';

test.describe('B. Account Lifecycle', { tag: '@account' }, () => {
  test('B1 - Register a new account', { tag: ['@critical', '@destructive', '@nightly'] }, async ({
    request,
    guestSession,
  }) => {
    const customers = clients.customers(request);

    await test.step('An email the platform rejects fails with a 400 fault', async () => {
      const response = await customers.register(guestSession.accessToken, {
        firstName: 'Cuj',
        lastName: 'Api',
        email: rejectedEmail('reg-invalid'),
        password: VALID_PASSWORD,
      });
      expect(response.status()).toBe(400);
      const fault = await parseJson<{ detail?: string }>(
        response,
        problemDetailSchema,
        'rejected registration',
      );
      expect(fault.detail).toMatch(/isn.t valid|not valid/i);
    });

    await test.step('A deliverable-looking email creates a registered customer', async () => {
      const response = await customers.register(guestSession.accessToken, {
        firstName: 'Cuj',
        lastName: 'Api',
        email: uniqueEmail('reg-valid'),
        password: VALID_PASSWORD,
      });
      expect(response.status()).toBe(200);
      const created = await parseJson<{ customerId: string; authType: string }>(
        response,
        customerRegistrationSchema,
        'successful registration',
      );
      expect(created.authType).toBe('registered');
      expect(created.customerId).toBeTruthy();
    });
  });

  test('B2 - Sign in with password (valid and invalid)', {
    tag: ['@critical', '@destructive', '@nightly'],
  }, async ({ request, guestSession }) => {
    const slas = clients.slas(request);
    const customers = clients.customers(request);

    const email = uniqueEmail('login');
    const registration = await customers.register(guestSession.accessToken, {
      firstName: 'Cuj',
      lastName: 'Login',
      email,
      password: VALID_PASSWORD,
    });
    expect(registration.status()).toBe(200);

    await test.step('Wrong credentials answer 401 without any token', async () => {
      // SLAS throttles repeated logins for the same user to one per second, answering
      // 409 while throttled — toPass retries until the real verdict (401) arrives.
      let status = 0;
      await expect(async () => {
        const attempt = await slas.loginWithPassword(email, 'DefinitelyWrongPassword!1');
        status = attempt.status;
        expect(status).not.toBe(409);
      }).toPass({ timeout: 10_000 });
      expect(status).toBe(401);
    });

    await test.step('Correct credentials exchange a token for the registered shopper', async () => {
      let login: Awaited<ReturnType<typeof slas.loginWithPassword>> | undefined;
      await expect(async () => {
        login = await slas.loginWithPassword(email, VALID_PASSWORD);
        expect(login.status).not.toBe(409);
      }).toPass({ timeout: 10_000 });
      expect(login).toMatchObject({
        status: 303,
        token: {
          access_token: expect.any(String),
          customer_id: expect.any(String),
        },
      });
    });
  });

  test(
    'B3 - Passwordless (email one-time code) login',
    { tag: ['@boundary', '@nightly'] },
    async ({ request, guestSession }, testInfo) => {
      const config = await readAppConfig(request);
      expect(config.login.passwordless.enabled).toBe(true);
      expect(config.login.passwordless.mode).toBe('email');

      const slas = clients.slas(request);

      const codeResponse = await slas.requestPasswordlessCode(
        uniqueEmail('otp'),
        guestSession.usid,
      );
      expect(codeResponse.status()).toBe(200);

      const verifyResponse = await slas.verifyPasswordlessCode('012345');
      expect(verifyResponse.status()).toBe(401);

      testInfo.annotations.push({
        type: 'boundary',
        description:
          'Success path (a real configured-length emailed code) needs live inbox access this ' +
          'automated pass does not have — see docs/cross-service-critical-user-journeys.md B3.',
      });
    },
  );

  test(
    'B4 - Social login (Google / Apple)',
    { tag: ['@boundary', '@nightly'] },
    async ({ request, guestSession }, testInfo) => {
      const config = await readAppConfig(request);
      expect(config.login.social.enabled).toBe(true);
      expect(config.login.social.idps).toEqual(expect.arrayContaining(['google', 'apple']));

      const slas = clients.slas(request);
      for (const idp of ['google', 'apple'] as const) {
        const authorizeResponse = await slas.socialAuthorize(idp, guestSession.usid);
        expect(authorizeResponse.status()).toBe(403);
        const body = await parseJson<{ message?: string }>(
          authorizeResponse,
          problemDetailSchema,
          `social authorize (${idp})`,
        );
        expect(body.message).toContain('not allowed through the SLAS Private Client Proxy');
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
    async ({ request, workerAccount }, testInfo) => {
      const config = await readAppConfig(request);
      expect(config.login.resetPassword.mode).toBe('email');

      // A registered address is used, mirroring the e2e flow. The public canary accepts the
      // request, while the staging proxy has no configured sender email and returns its
      // explicit service boundary instead.
      const resetResponse = await clients.slas(request).requestPasswordReset(workerAccount.email);
      const resetStatus = resetResponse.status();
      const resetBody = await resetResponse.text();
      if (env.E2E_TARGET === 'staging') {
        expect(resetStatus).toBe(401);
        expect(resetBody).toContain('no sender email defined');
      } else {
        expect(resetStatus).toBe(200);
        expect(resetBody).toBe('');
      }

      testInfo.annotations.push({
        type: 'boundary',
        description:
          'The UI masks the reset response behind anti-enumeration confirmation copy; staging ' +
          'has no sender email configured (401), while the public canary accepts the request ' +
          '(200). Completing a real reset needs a verified inbox plus the emailed link — see B5.',
      });
    },
  );

  test('B6 - Self-service password change (signed-in)', {
    tag: ['@destructive', '@nightly'],
  }, async ({ request, workerAccount }) => {
    const customers = clients.customers(request);
    const slas = clients.slas(request);

    let passwordChanged = false;
    try {
      await test.step('Change the password and confirm 204', async () => {
        const response = await customers.changePassword(
          workerAccount.accessToken,
          workerAccount.customerId,
          workerAccount.password,
          ALTERNATE_PASSWORD,
        );
        expect(response.status()).toBe(204);
        passwordChanged = true;
      });

      await test.step('The new credential actually signs in — the rotation is real', async () => {
        let login: Awaited<ReturnType<typeof slas.loginWithPassword>> | undefined;
        await expect(async () => {
          login = await slas.loginWithPassword(workerAccount.email, ALTERNATE_PASSWORD);
          expect(login.status).not.toBe(409);
        }).toPass({ timeout: 10_000 });
        expect(login).toMatchObject({ status: 303 });
      });
    } finally {
      // Revert even when the verification step fails so the worker account stays usable.
      if (passwordChanged) {
        await test.step('Revert the password, proving the flow is repeatable', async () => {
          const response = await customers.changePassword(
            workerAccount.accessToken,
            workerAccount.customerId,
            ALTERNATE_PASSWORD,
            workerAccount.password,
          );
          expect(response.status()).toBe(204);
        });
      }
    }
  });

  test('B7 - Edit profile details (phone number)', { tag: ['@destructive', '@nightly'] }, async ({
    request,
    workerAccount,
  }) => {
    const customers = clients.customers(request);
    const originalPhone =
      (await customers.getCustomer(workerAccount.accessToken, workerAccount.customerId))
        .phoneHome ?? '';

    try {
      const updated = await customers.updatePhone(
        workerAccount.accessToken,
        workerAccount.customerId,
        '4155550142',
      );
      expect(updated.phoneHome).toBe('4155550142');

      await test.step('The value persists on re-read, not just in the write echo', async () => {
        const reread = await customers.getCustomer(
          workerAccount.accessToken,
          workerAccount.customerId,
        );
        expect(reread.phoneHome).toBe('4155550142');
      });
    } finally {
      await customers.updatePhone(
        workerAccount.accessToken,
        workerAccount.customerId,
        originalPhone,
      );
    }
  });

  test('B8 - Manage saved addresses (add, default, remove)', {
    tag: ['@destructive', '@nightly'],
  }, async ({ request, workerAccount }) => {
    const customers = clients.customers(request);

    await customers.clearAddresses(workerAccount.accessToken, workerAccount.customerId);
    expect(
      await customers.listAddresses(workerAccount.accessToken, workerAccount.customerId),
    ).toEqual([]);

    let createdAddressId: string | undefined;
    try {
      await test.step('Adding with the default flag creates the default address', async () => {
        const created = await customers.addAddress(
          workerAccount.accessToken,
          workerAccount.customerId,
          {
            addressId: 'api-home',
            firstName: PRIMARY_ADDRESS.firstName,
            lastName: PRIMARY_ADDRESS.lastName,
            phone: PRIMARY_ADDRESS.phone,
            address1: PRIMARY_ADDRESS.address,
            city: PRIMARY_ADDRESS.city,
            stateCode: PRIMARY_ADDRESS.stateCode,
            postalCode: PRIMARY_ADDRESS.zip,
          },
          true,
        );
        createdAddressId = created.addressId;
        expect(created.preferred).toBe(true);
        expect(created.address1).toBe(PRIMARY_ADDRESS.address);
        expect(`${created.city}, ${created.stateCode} ${created.postalCode}`).toBe(
          `${PRIMARY_ADDRESS.city}, CA ${PRIMARY_ADDRESS.zip}`,
        );
      });
    } finally {
      if (createdAddressId) {
        const addressId = createdAddressId;
        await test.step('Removing it returns 204 and empties the book', async () => {
          const removal = await customers.removeAddress(
            workerAccount.accessToken,
            workerAccount.customerId,
            addressId,
          );
          expect(removal.status()).toBe(204);
          expect(
            await customers.listAddresses(workerAccount.accessToken, workerAccount.customerId),
          ).toEqual([]);
        });
      }
    }
  });

  test('B9 - View order history and order detail', { tag: ['@destructive', '@nightly'] }, async ({
    request,
    workerAccount,
  }) => {
    const session = {
      accessToken: workerAccount.accessToken,
      customerId: workerAccount.customerId,
    };
    const { order } = await placeSignedInOrder(
      request,
      session,
      {
        productId: PRODUCTS.hoopEarring.variantId,
        price: PRODUCTS.hoopEarring.unitPrice,
      },
      PRIMARY_ADDRESS,
      TEST_VISA,
    );
    expect(order.orderNo).toBeTruthy();

    const orders = await clients
      .customers(request)
      .listOrders(workerAccount.accessToken, workerAccount.customerId);
    expect((orders.data ?? []).map((entry) => entry.orderNo)).toContain(order.orderNo);

    await test.step('The detail read carries payment and the unshipped state', async () => {
      const detail = await clients
        .orders(request)
        .getOrder(workerAccount.accessToken, order.orderNo ?? '');
      expect(detail.orderNo).toBe(order.orderNo);
      expect(
        detail.paymentInstruments?.some(
          (instrument) => instrument.paymentMethodId === 'CREDIT_CARD',
        ),
      ).toBe(true);
      expect(detail.shipments?.every((s) => s.shippingStatus === 'not_shipped')).toBe(true);
    });
  });
});
