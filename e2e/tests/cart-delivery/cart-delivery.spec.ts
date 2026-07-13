import { expect, test } from '../../support/fixtures';
import * as Actions from './cart-delivery.actions';
import { deliveryProduct } from './cart-delivery.data';
import * as Locators from './cart-delivery.locators';

// Configure a variant, add it to the cart, and confirm the cart keeps that exact variant.
test('configure a variant and add it to the cart for delivery', async ({ page }) => {
  test.setTimeout(90000);

  await Actions.openProduct(page, deliveryProduct.masterId);

  await Actions.selectVariation(page, 'Color');
  await Actions.selectVariation(page, 'size');

  await Actions.addToCart(page);

  const confirmation = Locators.addConfirmation(page).first();
  await expect(confirmation).toBeVisible({ timeout: 15000 });
  await expect(confirmation).toContainText(deliveryProduct.name);
  await expect(confirmation).toContainText(deliveryProduct.color);
  await expect(confirmation).toContainText(deliveryProduct.size);
  await expect(confirmation).toContainText('Qty');

  await Actions.openCart(page);
  await expect(Locators.cartContainer(page)).toBeVisible();
  await expect(Locators.cartItem(page, deliveryProduct.variantId)).toBeVisible({ timeout: 15000 });
});
