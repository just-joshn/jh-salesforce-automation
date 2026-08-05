import { expect, test } from '../../support/fixtures';
import * as Actions from './login.actions';
import { credentialsAvailable, credentialsFromEnv } from './login.data';
import * as Locators from './login.locators';

// Same steps the auth setup reuses, asserted on their own.
test('sign in a registered shopper from the login page', async ({ page }) => {
  test.skip(!credentialsAvailable(), 'No shopper credentials configured; running guest-only.');
  test.setTimeout(60000);

  await Actions.openLogin(page);
  await Actions.signIn(page, credentialsFromEnv());

  // The login page is replaced once the shopper is authenticated.
  await expect(Locators.container(page)).toBeHidden({ timeout: 20000 });
});
