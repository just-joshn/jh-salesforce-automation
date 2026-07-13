import { test as base, type BrowserContext, type Page } from '@playwright/test';
import { AccountPage } from './pages/account.page';
import { AddressBookPage } from './pages/address-book.page';
import { CartPage } from './pages/cart.page';
import { CheckoutPage } from './pages/checkout.page';
import { LoginPage } from './pages/login.page';
import { OrderHistoryPage } from './pages/order-history.page';
import { ProductPage } from './pages/product.page';
import { RegisterPage } from './pages/register.page';
import { WishlistPage } from './pages/wishlist.page';
import { uniqueEmail, VALID_PASSWORD } from './test-data';

export interface WorkerAccount {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface TestFixtures {
  signedInPage: Page;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  productPage: ProductPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  accountPage: AccountPage;
  addressBookPage: AddressBookPage;
  wishlistPage: WishlistPage;
  orderHistoryPage: OrderHistoryPage;
}

interface WorkerFixtures {
  workerAccount: WorkerAccount;
  authenticatedContext: BrowserContext;
}

/**
 * `workerAccount` registers one real shopper account per worker (via the same UI flow
 * B1 exercises); workers never share an account, which keeps wishlist/cart/address state
 * isolated between them. `authenticatedContext` then signs in to that account once per
 * worker and keeps the resulting session alive for the rest of the worker's tests — the
 * "Per-Worker Authentication" pattern, so signed-in journeys pay for a UI login once each,
 * not once per test. `signedInPage` hands each individual test its own fresh tab (page)
 * inside that shared, already-authenticated context.
 *
 * Every other fixture below is a Page/Component Object, constructed once per test and
 * handed to tests already bound to the right `page` — tests describe the scenario,
 * fixtures handle construction, objects handle UI interaction.
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  workerAccount: [
    async ({ browser }, use) => {
      const account: WorkerAccount = {
        firstName: 'Cuj',
        lastName: 'Automation',
        email: uniqueEmail('worker'),
        password: VALID_PASSWORD,
      };
      const context = await browser.newContext();
      const page = await context.newPage();
      await new RegisterPage(page).register(account);
      await page.getByRole('button', { name: 'Open account menu' }).waitFor({ timeout: 20_000 });
      await context.close();
      await use(account);
    },
    { scope: 'worker' },
  ],

  authenticatedContext: [
    async ({ browser, workerAccount }, use) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await new LoginPage(page).loginWithPassword(workerAccount.email, workerAccount.password);
      await page.getByRole('button', { name: 'Open account menu' }).waitFor({ timeout: 20_000 });
      await page.close();

      await use(context);

      await context.close();
    },
    { scope: 'worker' },
  ],

  signedInPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();
    await use(page);
    await page.close();
  },

  // Guest-bound page objects (pre-authentication / unauthenticated journeys), each
  // constructed against the base `page` fixture. A test that also needs `signedInPage`
  // must NOT also request one of these five — that would silently drive two different
  // tabs (one authenticated, one not) instead of one. Construct `new ProductPage(page)`
  // (etc.) directly from `signedInPage` in that situation instead (see e.g. C1-C3, E4).
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },

  // Signed-in-bound page objects: every current use of these pages in this suite
  // requires an authenticated shopper, so they're wired to signedInPage directly.
  accountPage: async ({ signedInPage }, use) => {
    await use(new AccountPage(signedInPage));
  },
  addressBookPage: async ({ signedInPage }, use) => {
    await use(new AddressBookPage(signedInPage));
  },
  wishlistPage: async ({ signedInPage }, use) => {
    await use(new WishlistPage(signedInPage));
  },
  orderHistoryPage: async ({ signedInPage }, use) => {
    await use(new OrderHistoryPage(signedInPage));
  },
});

export { expect } from '@playwright/test';
