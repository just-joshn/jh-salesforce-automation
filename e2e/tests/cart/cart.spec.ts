import { findUiOrderableVariant } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import * as Actions from './cart.actions';
import { cartProduct } from './cart.data';
import * as Locators from './cart.locators';

// Build cart, raise qty, go to checkout. Remove/empty/totals = API test.
test('review a cart, update quantity, and proceed to checkout', async ({ page, request }) => {
  // Full flow is slow — extra time.
  test.setTimeout(90000);

  // Pick a size that is in stock right now.
  const { accessToken } = await getGuestToken(request);
  const variant = await findUiOrderableVariant(request, accessToken, cartProduct.masterId);

  await Actions.openProduct(page, variant.masterId);
  await Actions.selectVariation(page, 'Color');
  await Actions.selectSize(page, variant.sizeName);
  await Actions.addToCart(page);
  await expect(Locators.addConfirmation(page).first()).toBeVisible({ timeout: 15000 });

  await Actions.openCart(page);
  await expect(Locators.cartContainer(page)).toBeVisible({ timeout: 15000 });
  await expect(Locators.cartItem(page, variant.variantId)).toBeVisible();
  await expect(Locators.itemQuantity(page, variant.variantId)).toHaveValue('1');
  await expect(Locators.orderSummary(page)).toBeVisible();

  await Actions.incrementQuantity(page, variant.variantId);
  await expect(Locators.itemQuantity(page, variant.variantId)).toHaveValue('2');

  await Actions.proceedToCheckout(page);
  await expect(page).toHaveURL((url) => url.pathname.endsWith('/checkout'));
  await expect(Locators.checkoutContainer(page)).toBeVisible({ timeout: 15000 });
});
