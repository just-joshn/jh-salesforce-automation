import { expect, test } from '../../support/fixtures';
import * as Actions from './register.actions';
import { registrant, uniqueEmail } from './register.data';
import * as Locators from './register.locators';

// Register a new account and confirm it lands signed in on the account page.
test('create an account and land on the signed-in account page', async ({ page }) => {
  test.setTimeout(60000);

  await Actions.openRegistration(page);
  await Actions.register(page, registrant(uniqueEmail()));

  // Log Out only exists once signed in, and it's tucked in a menu that's hidden on wide screens, so
  // assert it's attached rather than visible.
  await expect(page).toHaveURL(/\/account\/?$/, { timeout: 20000 });
  await expect(Locators.logout(page).first()).toBeAttached();
});
