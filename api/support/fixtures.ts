import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { env } from './env';
import { readAppConfig } from './app-config';
import { SlasClient } from './auth.client';
import { BasketsClient } from './baskets.client';
import { CustomersClient } from './customers.client';
import { OrdersClient } from './orders.client';
import { SearchClient } from './search.client';
import { StoresClient } from './stores.client';
import { uniqueEmail, VALID_PASSWORD } from './test-data';
import { parseJson } from './response';
import { customerRegistrationSchema } from './schemas';

export interface WorkerAccount {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  customerId: string;
  accessToken: string;
}

interface TestFixtures {
  /** A fresh anonymous session — the API equivalent of a brand-new browser context. */
  guestSession: GuestSession;
}

export interface GuestSession {
  accessToken: string;
  usid: string;
  customerId: string;
}

interface WorkerFixtures {
  /**
   * One registered shopper per worker (registered and signed in via the same API calls
   * B1/B2 make), its token kept alive for the worker's signed-in journeys — the same
   * per-worker authentication shape e2e/support/fixtures.ts uses, minus the browser.
   */
  workerAccount: WorkerAccount;
}

/**
 * Domain clients are constructed per test from Playwright's own `request` fixture —
 * APIRequestContext is the API suite's "page": the thing every client operates on.
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  workerAccount: [
    async ({ playwright }, use, workerInfo) => {
      // `request` is test-scoped; the worker scope offers `playwright` instead, whose
      // newContext() is the documented way to build an API-only context — the same
      // per-worker pattern the e2e suite uses for its browser context, minus the browser.
      const request = await playwright.request.newContext({ baseURL: env.E2E_BASE_URL });
      try {
        const slas = new SlasClient(request);
        const customers = new CustomersClient(request);

        const guest = await slas.guestToken();
        const account = {
          firstName: 'Cuj',
          lastName: 'Api',
          email: uniqueEmail('worker', workerInfo.workerIndex),
          password: VALID_PASSWORD,
        };
        const registration = await customers.register(guest.access_token, account);
        expect(registration.status(), 'worker account registration').toBe(200);
        const created = await parseJson<{ customerId: string }>(
          registration,
          customerRegistrationSchema,
          'worker account registration',
        );

        const login = await slas.loginWithPassword(account.email, account.password, guest.usid);
        expect(login.status, 'worker account login').toBe(303);
        const token = login.token;
        if (!token) {
          throw new Error('worker account login produced no token');
        }

        await use({
          ...account,
          customerId: created.customerId,
          accessToken: token.access_token,
        });
      } finally {
        await request.dispose();
      }
    },
    { scope: 'worker' },
  ],

  guestSession: async ({ request }, use) => {
    const guest = await new SlasClient(request).guestToken();
    await use({
      accessToken: guest.access_token,
      usid: guest.usid,
      customerId: guest.customer_id,
    });
  },
});

export { expect };

/** The domain clients, bound to whichever request context a test is using. */
export const clients = {
  slas: (request: APIRequestContext) => new SlasClient(request),
  customers: (request: APIRequestContext) => new CustomersClient(request),
  baskets: (request: APIRequestContext) => new BasketsClient(request),
  orders: (request: APIRequestContext) => new OrdersClient(request),
  search: (request: APIRequestContext) => new SearchClient(request),
  stores: (request: APIRequestContext) => new StoresClient(request),
};

/** H1: probes an SFRA controller route on the storefront host — expect 404 (no SFRA here). */
export async function probeSfraRoute(request: APIRequestContext, route: string): Promise<number> {
  const url = new URL(
    `/on/demandware.store/Sites-${env.SFCC_SITE_ID}-Site/en_US/${route}`,
    env.E2E_BASE_URL,
  ).toString();
  const response = await request.get(url);
  return response.status();
}

export { readAppConfig };
