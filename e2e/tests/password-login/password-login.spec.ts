import { findOrderableVariant } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import * as Actions from './password-login.actions';
import {
  accountCredentials,
  credentialSkipReason,
  invalidCredentials,
  registeredBasketItemCount,
  shoppingPath,
  toJourneyProduct,
} from './password-login.data';
import * as Locators from './password-login.locators';

test('CUJ 10 — preserves guest cart when shopper signs in with password', async ({
  page,
  request,
}) => {
  if (!accountCredentials) {
    test.skip(true, credentialSkipReason);
    return;
  }
  const credentials = accountCredentials;
  const token = await getGuestToken(request);
  const journeyProduct = toJourneyProduct(await findOrderableVariant(request, token.access_token));

  await test.step('Build guest basket', async () => {
    await Actions.buildGuestBasket(page, journeyProduct);
    await expect(Locators.cartProduct(page, journeyProduct.name)).toBeVisible();
  });

  await test.step('Submit credentials', async () => {
    await Actions.signIn(page, credentials);
    await expect(Locators.authenticatedAccountMenu(page)).toBeVisible();
  });

  await test.step('Load registered basket context', async () => {
    await expect(Locators.cartButtonWithCount(page, registeredBasketItemCount)).toBeVisible();
  });

  await test.step('Merge guest/registered baskets', async () => {
    await Actions.returnToBasket(page);
    await expect(Locators.cartProduct(page, journeyProduct.name)).toBeVisible();
  });

  await test.step('Return to shopping/account', async () => {
    await Actions.visitStorefront(page);
    await expect(page).toHaveURL(shoppingPath);
    await expect(Locators.cartButton(page)).toBeVisible();
  });
});

test('CUJ 10 — rejects invalid password without authenticating shopper', async ({ page }) => {
  await test.step('Submit credentials', async () => {
    await Actions.visitStorefront(page);
    await Actions.submitCredentials(page, invalidCredentials);
  });

  await test.step('Return to shopping/account', async () => {
    await expect(Locators.authenticationError(page)).toBeVisible();
    await expect(Locators.authenticatedAccountMenu(page)).not.toBeVisible();
  });
});
