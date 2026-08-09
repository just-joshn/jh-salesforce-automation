import { test } from '../support/fixtures';
import { signIn, visitStorefront } from '../tests/password-login/password-login.actions';
import {
  accountCredentials,
  credentialSkipReason,
} from '../tests/password-login/password-login.data';

const authenticationStatePath = 'playwright/.auth/user.json';

test('authenticate configured shopper', async ({ page }) => {
  if (!accountCredentials) {
    test.skip(true, credentialSkipReason);
    return;
  }

  await visitStorefront(page);
  await signIn(page, accountCredentials);
  await page.context().storageState({ path: authenticationStatePath });
});
