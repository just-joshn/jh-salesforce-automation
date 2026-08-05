import { expect, test } from '../../support/fixtures';
import * as Actions from './configure-and-add.actions';
import {
  addedToCartHeading,
  cartHeading,
  colorLabel,
  configuration,
  deliveryOption,
  orderableVariant,
  quantityLabel,
  sizeLabel,
} from './configure-and-add.data';
import * as Locators from './configure-and-add.locators';

// Choices made on the product page have to survive into the basket: the same
// sellable id, the same options, the same amount, still shipping to an address.
test('configure a variant with a quantity and add it to the cart', async ({ page, request }) => {
  test.setTimeout(90000);

  const variant = await orderableVariant(request);

  await Actions.openProduct(page, variant.masterId);
  await expect(Locators.productDetail(page)).toBeVisible();

  await Actions.selectColor(page, variant.colorName);
  await Actions.selectSize(page, variant.sizeName);
  await Actions.raiseQuantityTo(page, configuration.quantity);

  await expect(Locators.quantityInput(page)).toHaveValue(String(configuration.quantity));
  await expect(Locators.deliveryOption(page)).toBeChecked();
  await expect(Locators.addToCart(page)).toBeEnabled();

  await Actions.addToCart(page);

  const confirmation = Locators.addConfirmation(page);
  await expect(confirmation).toBeVisible({ timeout: 15000 });
  await expect(confirmation).toContainText(addedToCartHeading(configuration.quantity));

  const added = Locators.addedProduct(page);
  await expect(added).toContainText(variant.productName);
  await expect(added).toContainText(colorLabel(variant.colorName));
  await expect(added).toContainText(sizeLabel(variant.sizeName));
  await expect(added).toContainText(quantityLabel(configuration.quantity));

  await Actions.openCart(page);
  await expect(Locators.cartContainer(page)).toBeVisible({ timeout: 15000 });
  await expect(Locators.cartHeading(page, cartHeading(configuration.quantity))).toBeVisible();

  await expect(Locators.cartItem(page, variant.variantId)).toBeVisible({ timeout: 15000 });
  await expect(Locators.itemQuantity(page, variant.variantId)).toHaveValue(
    String(configuration.quantity),
  );
  await expect(Locators.itemFulfillment(page, variant.variantId)).toHaveValue(deliveryOption);
});
