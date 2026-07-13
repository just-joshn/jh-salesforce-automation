import { expect, test } from '../../support/fixtures';
import * as Actions from './cart.actions';
import { cartProduct } from './cart.data';
import * as Locators from './cart.locators';

// Review a built cart, bump the quantity, and hand off to checkout.
// Item removal, the empty-cart state, and total math live in the cart API test.
test('review a cart, update quantity, and proceed to checkout', async ({ page }) => {
  // Full click-through on the shared demo store, so it needs the headroom.
  test.setTimeout(90000);

  await Actions.openProduct(page, cartProduct.masterId);
  await Actions.selectVariation(page, 'Color');
  await Actions.selectVariation(page, 'size');
  await Actions.addToCart(page);
  await expect(Locators.addConfirmation(page).first()).toBeVisible({ timeout: 15000 });

  await Actions.openCart(page);
  await expect(Locators.cartContainer(page)).toBeVisible({ timeout: 15000 });
  await expect(Locators.cartItem(page, cartProduct.variantId)).toBeVisible();
  await expect(Locators.itemQuantity(page, cartProduct.variantId)).toHaveValue('1');
  await expect(Locators.orderSummary(page)).toBeVisible();

  await Actions.incrementQuantity(page, cartProduct.variantId);
  await expect(Locators.itemQuantity(page, cartProduct.variantId)).toHaveValue('2');

  await Actions.proceedToCheckout(page);
  await expect(page).toHaveURL((url) => url.pathname.endsWith('/checkout'));
  await expect(Locators.checkoutContainer(page)).toBeVisible({ timeout: 15000 });
});
