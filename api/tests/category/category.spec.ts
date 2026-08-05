import { expect, test } from '@playwright/test';
import type { Category, Product, ProductSearchResult } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import * as Actions from './category.actions';
import { firstHit, hitsOf, invalidCategory, validCategory } from './category.data';

// Category list, open product, unknown id → 404.
test('a category returns its details and product list; an unknown category is not found', async ({
  request,
}) => {
  const { accessToken } = await getGuestToken(request);

  const categoryResponse = await Actions.getCategory(request, accessToken, validCategory.id);
  expect(categoryResponse.status()).toBe(200);
  const category = (await categoryResponse.json()) as Category;
  expect(category.id).toBe(validCategory.id);
  expect(category.name).toBeTruthy();

  // Category must have products.
  const searchResponse = await Actions.searchByCategory(request, accessToken, validCategory.id);
  expect(searchResponse.status()).toBe(200);
  const result = (await searchResponse.json()) as ProductSearchResult;
  expect(result.total).toBeGreaterThan(0);
  const hits = hitsOf(result);
  expect(hits.length).toBeGreaterThan(0);

  // Each hit: id, name, stock flag; some have price.
  for (const hit of hits) {
    expect(hit.productId).toBeTruthy();
    expect(hit.productName).toBeTruthy();
  }
  expect(hits.some((hit) => typeof hit.price === 'number' && hit.price > 0)).toBe(true);
  const topHit = firstHit(result);
  expect(typeof topHit.orderable).toBe('boolean');

  // Open hit → same product.
  const productResponse = await Actions.getProduct(request, accessToken, topHit.productId);
  expect(productResponse.status()).toBe(200);
  const product = (await productResponse.json()) as Product;
  expect(product.id).toBe(topHit.productId);

  // Unknown category → 404.
  const invalidResponse = await Actions.getCategory(request, accessToken, invalidCategory.id);
  expect(invalidResponse.status()).toBe(404);
});
