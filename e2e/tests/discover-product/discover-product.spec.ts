import { expect, test } from '../../support/fixtures';
import * as Actions from './discover-product.actions';
import {
  calloutPattern,
  discoveryQuery,
  productUrl,
  promotedProduct,
  searchResultsUrl,
  selectedVariantUrl,
} from './discover-product.data';
import * as Locators from './discover-product.locators';

// Search hands the shopper a product; the product page has to answer "is this
// the right thing, and can I buy it?" — variant, price, image, promotion, stock.
test('search for a product and evaluate it down to a sellable size', async ({ page, request }) => {
  test.setTimeout(90000);

  const product = await promotedProduct(request);

  await Actions.openStorefront(page);
  await Actions.search(page, discoveryQuery.term);
  await expect(page).toHaveURL(searchResultsUrl(discoveryQuery.term));

  await expect(Locators.productList(page)).toBeVisible();
  await expect(Locators.productTiles(page)).not.toHaveCount(0);
  await expect(Locators.productTile(page, product.masterId)).toBeVisible({ timeout: 15000 });

  await Actions.openProduct(page, product.masterId);
  await expect(page).toHaveURL(productUrl(product.masterId));
  await expect(Locators.productDetail(page)).toBeVisible();

  // Everything the shopper judges the product on.
  await expect(Locators.productHeading(page, product.productName)).toBeVisible();
  await expect(Locators.currentPrice(page)).toBeVisible();
  await expect(Locators.mainImage(page)).toBeVisible();
  await expect(Locators.promoCallout(page)).toHaveText(calloutPattern(product.calloutMessages));

  await expect(Locators.variationGroup(page, 'Color')).toBeVisible();
  await expect(Locators.variationGroup(page, 'size')).toBeVisible();

  await Actions.selectColor(page, product.colorName);
  await Actions.selectSize(page, product.sizeName);

  // The chosen size is a real, in-stock id the page is ready to sell.
  await expect(page).toHaveURL(selectedVariantUrl(product.variantId));
  await expect(Locators.addToCart(page)).toBeEnabled();
});
