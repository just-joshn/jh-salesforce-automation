import { expect, test } from '../../support/fixtures';
import * as Actions from './register.actions';
import { registrant, uniqueEmail } from './register.data';
import * as Locators from './register.locators';

// Create account and land signed in.
test('create an account and land on the signed-in account page', async ({ page }) => {
  test.setTimeout(60000);

  await Actions.openRegistration(page);
  await Actions.register(page, registrant(uniqueEmail()));

  // Log Out proves sign-in. May be hidden in a menu — check attached, not visible.
  await expect(page).toHaveURL(/\/account\/?$/, { timeout: 20000 });
  await expect(Locators.logout(page).first()).toBeAttached();
});
