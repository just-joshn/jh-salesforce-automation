import { findUiOrderableVariant } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import * as Actions from './cart-delivery.actions';
import { deliveryProduct } from './cart-delivery.data';
import * as Locators from './cart-delivery.locators';

// Configure a variant, add it to the cart, and confirm the cart keeps that exact variant.
test('configure a variant and add it to the cart for delivery', async ({ page, request }) => {
  test.setTimeout(90000);

  // Resolve a variant that is in stock right now; hardcoded variants go stale as stock drains.
  const { accessToken } = await getGuestToken(request);
  const variant = await findUiOrderableVariant(request, accessToken, deliveryProduct.masterId);

  await Actions.openProduct(page, variant.masterId);

  await Actions.selectVariation(page, 'Color');
  await Actions.selectSize(page, variant.sizeName);

  await Actions.addToCart(page);

  const confirmation = Locators.addConfirmation(page).first();
  await expect(confirmation).toBeVisible({ timeout: 15000 });
  await expect(confirmation).toContainText(variant.productName);
  await expect(confirmation).toContainText(variant.colorName);
  await expect(confirmation).toContainText(variant.sizeName);
  await expect(confirmation).toContainText('Qty');

  await Actions.openCart(page);
  await expect(Locators.cartContainer(page)).toBeVisible();
  await expect(Locators.cartItem(page, variant.variantId)).toBeVisible({ timeout: 15000 });
});
