import { expect, test } from '@playwright/test';
import { required } from '../../support/scapi';
import type { Product, ProductSearchResult } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import * as Actions from './discover-product.actions';
import {
  discoveryQuery,
  promotedProduct,
  promotionCallouts,
  searchHits,
  variantOf,
  variationAttribute,
  variationDisplayName,
} from './discover-product.data';

// Search hands the shopper a product. Product resources then answer whether it
// is the right thing and whether its selected size can be bought.
test('search for a product and evaluate it down to a sellable size', async ({ request }) => {
  test.setTimeout(90000);

  const product = await promotedProduct(request);

  // Opening the storefront starts a guest session; the API counterpart uses its token directly.
  const { accessToken } = await getGuestToken(request);
  const searchResponse = await Actions.searchProducts(request, accessToken, discoveryQuery.term);
  expect(searchResponse.status()).toBe(200);
  const search = (await searchResponse.json()) as ProductSearchResult;

  // Substitutes the browser search-results URL assertion: SCAPI echoes the submitted query.
  expect(search.query).toBe(discoveryQuery.term);

  // Product-list visibility is represented by a successful, populated search payload.
  expect(searchHits(search)).not.toHaveLength(0);
  expect(searchHits(search).map((hit) => hit.productId)).toContain(product.masterId);

  const productResponse = await Actions.openProduct(request, accessToken, product.masterId);
  expect(productResponse.status()).toBe(200);
  const master = (await productResponse.json()) as Product;

  // Substitutes the product URL and rendered product-detail assertions.
  expect(master.id).toBe(product.masterId);

  // Everything the shopper judges the product on.
  expect(master.name).toBe(product.productName);
  expect(typeof master.price).toBe('number');
  expect(required(master.imageGroups, 'imageGroups')).not.toHaveLength(0);
  expect(promotionCallouts(master)).toEqual(product.calloutMessages);

  expect(variationAttribute(master, 'color').id).toBe('color');
  expect(variationAttribute(master, 'size').id).toBe('size');

  const chosenVariant = variantOf(master, product.variantId);
  expect(variationDisplayName(master, chosenVariant, 'color')).toBe(product.colorName);
  expect(variationDisplayName(master, chosenVariant, 'size')).toBe(product.sizeName);

  const variantResponse = await Actions.openProduct(request, accessToken, product.variantId);
  expect(variantResponse.status()).toBe(200);
  const variant = (await variantResponse.json()) as Product;

  // Substitutes the selected-variant URL assertion: the resolved resource is that exact SKU.
  expect(variant.id).toBe(product.variantId);

  // API counterpart of Add to Cart being enabled: selected SKU is orderable with real stock.
  const inventory = required(variant.inventory, 'inventory');
  expect(inventory.orderable).toBe(true);
  expect(required(inventory.ats, 'inventory.ats')).toBeGreaterThan(0);
});
