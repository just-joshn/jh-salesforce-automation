import { test as base, type BrowserContext, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { expectSignedIn } from '../site';
import { uniqueEmail, VALID_PASSWORD } from '../test-data';

export interface WorkerAccount { firstName: string; lastName: string; email: string; password: string }

type LifecycleFixtures = { signedInPage: Page; locationDeniedPage: Page };
type WorkerFixtures = { workerAccount: WorkerAccount; authenticatedContext: BrowserContext };

export const lifecycleTest = base.extend<LifecycleFixtures, WorkerFixtures>({
  workerAccount: [async ({ browser }, use) => {
    const account: WorkerAccount = { firstName: 'Cuj', lastName: 'Automation', email: uniqueEmail('worker'), password: VALID_PASSWORD };
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await new RegisterPage(page).register(account);
      await expectSignedIn(page);
    } finally { await context.close(); }
    await use(account);
  }, { scope: 'worker' }],
  authenticatedContext: [async ({ browser, workerAccount }, use) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await new LoginPage(page).loginWithPassword(workerAccount.email, workerAccount.password);
      await expectSignedIn(page);
      await page.close();
      await use(context);
    } finally { await context.close(); }
  }, { scope: 'worker' }],
  signedInPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();
    await use(page);
    await page.close();
  },
  locationDeniedPage: async ({ browser }, use) => {
    const context = await browser.newContext({ permissions: [] });
    try { await use(await context.newPage()); } finally { await context.close(); }
  },
});
