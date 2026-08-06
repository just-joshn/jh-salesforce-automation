import { expect, test } from '../../support/fixtures';
import * as Actions from './prepare-cart.actions';
import {
  cartHeading,
  checkoutUrl,
  deliveryGroupLabel,
  deliveryOption,
  orderableVariants,
} from './prepare-cart.data';
import * as Locators from './prepare-cart.locators';

// A cart is only ready for checkout once the shopper has seen every line priced,
// fixed the amounts, dropped what they don't want, and kept the handover intact.
test('review a two item cart, fix it up, and take it to checkout', async ({ page, request }) => {
  test.setTimeout(150000);

  const [kept, removed] = await orderableVariants(request);

  await Actions.addProductToCart(page, kept);
  await Actions.addProductToCart(page, removed);

  await Actions.openCart(page);
  await expect(Locators.cartContainer(page)).toBeVisible({ timeout: 15000 });
  await expect(Locators.cartHeading(page, cartHeading(2))).toBeVisible();

  // Both lines come back filled in from the product catalog.
  await expect(Locators.itemName(page, kept.variantId, kept.productName)).toBeVisible({
    timeout: 15000,
  });
  await expect(Locators.itemPrice(page, kept.variantId)).toBeVisible();
  await expect(Locators.itemName(page, removed.variantId, removed.productName)).toBeVisible();
  await expect(Locators.itemPrice(page, removed.variantId)).toBeVisible();

  await expect(Locators.orderSummary(page)).toBeVisible();

  // Promotions are reviewed from the cart: the code entry is one click away.
  await Actions.openPromoCode(page);
  await expect(Locators.promoCodeInput(page)).toBeVisible();

  // Handover stays as delivery. Collecting in store needs a store first.
  await expect(Locators.itemFulfillment(page, kept.variantId)).toHaveValue(deliveryOption);
  await expect(Locators.itemPickupChoice(page, kept.variantId)).toBeDisabled();

  await Actions.increaseQuantity(page, kept.variantId, kept.productName);
  // The heading trails the basket update, so it is the slower signal to wait for.
  await expect(Locators.cartHeading(page, cartHeading(3))).toBeVisible();
  await expect(Locators.itemQuantity(page, kept.variantId)).toHaveValue('2');

  await Actions.removeItem(page, removed.variantId);
  await expect(Locators.removeConfirmation(page)).toBeVisible();
  await Actions.confirmRemoval(page);

  await expect(Locators.cartItem(page, removed.variantId)).toHaveCount(0);
  await expect(Locators.cartHeading(page, cartHeading(2))).toBeVisible();
  await expect(Locators.cartItem(page, kept.variantId)).toBeVisible();
  await expect(Locators.deliveryGroup(page, deliveryGroupLabel(1))).toBeVisible();
  await expect(Locators.itemFulfillment(page, kept.variantId)).toHaveValue(deliveryOption);

  await Actions.proceedToCheckout(page);
  await expect(page).toHaveURL(checkoutUrl);
  await expect(Locators.checkoutContainer(page)).toBeVisible({ timeout: 15000 });
});
