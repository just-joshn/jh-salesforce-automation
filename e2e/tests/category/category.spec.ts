import { expect, test } from '../../support/fixtures';
import * as Actions from './category.actions';
import { validCategory } from './category.data';
import * as Locators from './category.locators';

// Browse a category, open a product, and confirm you land on that exact PDP.
test('browse a category and open the selected product detail page', async ({ page }) => {
  await Actions.gotoCategory(page, validCategory.id);

  await expect(Locators.productList(page)).toBeVisible();
  await expect(Locators.heading(page)).toContainText(validCategory.name);
  await expect(Locators.productTiles(page)).not.toHaveCount(0);

  await expect(Locators.anyTilePrice(page)).toBeVisible();

  await expect(Locators.pagination(page)).toBeVisible();

  // sorting must not wipe the grid
  await Actions.sortByFirstOption(page);
  await expect(Locators.productList(page)).toBeVisible();
  await expect(Locators.anyTilePrice(page)).toBeVisible();
  await expect(Locators.productTiles(page)).not.toHaveCount(0);

  const productId = await Actions.openFirstProduct(page);
  expect(productId).not.toBe('');

  await expect(Locators.productDetail(page)).toBeVisible();
  await expect(page).toHaveURL((url) => url.pathname.includes(`/product/${productId}`));
});
