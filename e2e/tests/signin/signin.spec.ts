import { expect, test } from '../../support/fixtures';
import * as Actions from './signin.actions';
import { newCredentials, orderableVariant, provisionCustomer } from './signin.data';
import * as Locators from './signin.locators';

// Sign-in keeps the guest cart item. Bad-password checks live in the API test.
test('sign in preserves the guest cart and authenticates the shopper', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const credentials = newCredentials();

  // Make account via API; browser stays guest until sign-in.
  await provisionCustomer(request, credentials);

  const variant = await orderableVariant(request);

  await Actions.addProductToCart(page, variant.masterId, variant.sizeName);
  await Actions.openCart(page);
  await expect(Locators.cartItem(page, variant.variantId)).toBeVisible({ timeout: 15000 });

  await Actions.signIn(page, credentials);

  await expect(Locators.logout(page).first()).toBeAttached();
  await Actions.openCart(page);
  await expect(Locators.cartItem(page, variant.variantId)).toBeVisible({ timeout: 15000 });
});
