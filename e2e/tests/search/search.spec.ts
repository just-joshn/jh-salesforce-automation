import { expect, test } from '../../support/fixtures';
import * as Actions from './search.actions';
import { commonQuery, productUrl, searchResultsUrl } from './search.data';
import * as Locators from './search.locators';

// Search → open result → right product page.
test('search for a term and open the selected product detail page', async ({ page }) => {
  await Actions.openStorefront(page);

  await Actions.search(page, commonQuery.term);
  await expect(page).toHaveURL(searchResultsUrl(commonQuery.term));

  // Search should find something.
  await expect(Locators.productList(page)).toBeVisible();
  await expect(Locators.resultsHeading(page)).toContainText(commonQuery.term);
  await expect(Locators.productTiles(page)).not.toHaveCount(0);

  await expect(Locators.anyTilePrice(page)).toBeVisible();

  const productId = await Actions.openFirstProduct(page);
  expect(productId).not.toBe('');

  await expect(Locators.productDetail(page)).toBeVisible();
  await expect(page).toHaveURL(productUrl(productId));
});
