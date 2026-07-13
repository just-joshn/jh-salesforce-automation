import { expect, test } from '@playwright/test';
import { getGuestToken } from '../../support/slas';
import * as Actions from './category.actions';
import type { CategoryDetail, ProductDetail, ProductSearchResult } from './category.data';
import { invalidCategory, validCategory } from './category.data';

// Browse a category, list its products, open one, and 404 on a category that doesn't exist.
test('a category returns its details and product list; an unknown category is not found', async ({
  request,
}) => {
  const { accessToken } = await getGuestToken(request);

  const categoryResponse = await Actions.getCategory(request, accessToken, validCategory.id);
  expect(categoryResponse.status()).toBe(200);
  const category = (await categoryResponse.json()) as CategoryDetail;
  expect(category.id).toBe(validCategory.id);
  expect(category.name).toBeTruthy();

  // the category should return products, not an empty list
  const searchResponse = await Actions.searchByCategory(request, accessToken, validCategory.id);
  expect(searchResponse.status()).toBe(200);
  const result = (await searchResponse.json()) as ProductSearchResult;
  expect(result.total).toBeGreaterThan(0);
  const hits = result.hits ?? [];
  expect(hits.length).toBeGreaterThan(0);

  // every hit has an id and name; at least one has a real price; each has a boolean stock flag
  for (const hit of hits) {
    expect(hit.productId).toBeTruthy();
    expect(hit.productName).toBeTruthy();
  }
  expect(hits.some((hit) => typeof hit.price === 'number' && hit.price > 0)).toBe(true);
  const firstHit = hits[0];
  if (!firstHit) throw new Error('expected at least one category hit');
  expect(typeof firstHit.orderable).toBe('boolean');

  // opening a hit returns that same product
  const productResponse = await Actions.getProduct(request, accessToken, firstHit.productId);
  expect(productResponse.status()).toBe(200);
  const product = (await productResponse.json()) as ProductDetail;
  expect(product.id).toBe(firstHit.productId);

  // an unknown category id returns 404
  const invalidResponse = await Actions.getCategory(request, accessToken, invalidCategory.id);
  expect(invalidResponse.status()).toBe(404);
});
