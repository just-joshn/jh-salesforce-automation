import { expect, test } from '../../support/fixtures';
import * as Actions from './cart-delivery.actions';
import { orderableVariant, quantityLabel } from './cart-delivery.data';
import * as Locators from './cart-delivery.locators';

// Pick size, add to cart, cart keeps that item.
test('configure a variant and add it to the cart for delivery', async ({ page, request }) => {
  test.setTimeout(90000);

  const variant = await orderableVariant(request);

  await Actions.openProduct(page, variant.masterId);

  await Actions.selectVariation(page, 'Color');
  await Actions.selectSize(page, variant.sizeName);

  await Actions.addToCart(page);

  const confirmation = Locators.addConfirmation(page).first();
  await expect(confirmation).toBeVisible({ timeout: 15000 });
  await expect(confirmation).toContainText(variant.productName);
  await expect(confirmation).toContainText(variant.colorName);
  await expect(confirmation).toContainText(variant.sizeName);
  await expect(confirmation).toContainText(quantityLabel);

  await Actions.openCart(page);
  await expect(Locators.cartContainer(page)).toBeVisible();
  await expect(Locators.cartItem(page, variant.variantId)).toBeVisible({ timeout: 15000 });
});
