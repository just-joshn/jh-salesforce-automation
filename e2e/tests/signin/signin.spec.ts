import { findUiOrderableVariant } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import * as Actions from './signin.actions';
import { password, product, uniqueEmail } from './signin.data';
import * as Locators from './signin.locators';

// Signing in merges the guest cart into the account without losing or duplicating the item.
// Credential validation and rejection are covered by the sign-in API test.
test('sign in preserves the guest cart and authenticates the shopper', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const credentials = { email: uniqueEmail(), password };

  // Create the account over the API so the browser stays a fresh guest and the cart merge runs for real at sign-in.
  await Actions.provisionViaApi(request, credentials);

  // Resolve a variant that is in stock right now; hardcoded variants go stale as stock drains.
  const { accessToken } = await getGuestToken(request);
  const variant = await findUiOrderableVariant(request, accessToken, product.masterId);

  await Actions.addProductToCart(page, variant.masterId, variant.sizeName);
  await Actions.openCart(page);
  await expect(Locators.cartItem(page, variant.variantId)).toBeVisible({ timeout: 15000 });

  await Actions.signIn(page, credentials);

  await expect(Locators.logout(page).first()).toBeAttached();
  await Actions.openCart(page);
  await expect(Locators.cartItem(page, variant.variantId)).toBeVisible({ timeout: 15000 });
});
