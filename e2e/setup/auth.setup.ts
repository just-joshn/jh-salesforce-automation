import { test as setup } from '../support/fixtures';
import { hasAccountCredentials } from '../../config/env';
import { credentialsFromEnv } from '../tests/login/login.data';
import * as Login from '../tests/login/login.actions';

// The signed-in session is saved here for the other projects to reuse. Gitignored.
const authFile = 'playwright/.auth/user.json';

setup('authenticate registered shopper', async ({ page }) => {
  setup.skip(!hasAccountCredentials(), 'No shopper credentials configured; running guest-only.');

  await Login.openLogin(page);
  await Login.signIn(page, credentialsFromEnv());
  await Login.waitForSignedIn(page);

  await page.context().storageState({ path: authFile });
});
