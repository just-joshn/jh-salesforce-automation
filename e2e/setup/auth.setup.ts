import { test as setup } from '@playwright/test';
import { hasAccountCredentials } from '../../config/env';
import { credentialsFromEnv } from '../tests/login/login.data';
import * as Login from '../tests/login/login.actions';

// Saved signed-in session, reused by the other projects. Gitignored.
const authFile = 'playwright/.auth/user.json';

setup('authenticate registered shopper', async ({ page }) => {
  setup.skip(!hasAccountCredentials(), 'No shopper credentials configured; running guest-only.');

  await Login.openLogin(page);
  await Login.signIn(page, credentialsFromEnv());
  await Login.waitForSignedIn(page);

  await page.context().storageState({ path: authFile });
});
