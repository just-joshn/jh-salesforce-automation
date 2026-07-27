import { expect, test } from '@playwright/test';
import { getGuestToken } from '../../support/slas';
import * as Actions from './search.actions';
import type { ProductDetail, ProductSearchResult } from './search.data';
import { commonQuery, hitsOf, noMatchQuery } from './search.data';

// Search hits open correctly; no match = empty, not error.
test('search returns matching products that open correctly; a no-match search is empty', async ({
  request,
}) => {
  const { accessToken } = await getGuestToken(request);

  // Search should find products.
  const response = await Actions.searchProducts(request, accessToken, commonQuery.term);
  expect(response.status()).toBe(200);
  const result = (await response.json()) as ProductSearchResult;
  expect(result.total).toBeGreaterThan(0);
  const hits = hitsOf(result);
  expect(hits.length).toBeGreaterThan(0);

  // Each hit: id, name, price, stock flag.
  for (const hit of hits) {
    expect(hit.productId).toBeTruthy();
    expect(hit.productName).toBeTruthy();
  }
  expect(hits.some((hit) => typeof hit.price === 'number' && hit.price > 0)).toBe(true);
  const firstHit = hits[0];
  if (!firstHit) throw new Error('expected at least one search hit');
  expect(typeof firstHit.orderable).toBe('boolean');

  // First hit opens that product.
  const productResponse = await Actions.getProduct(request, accessToken, firstHit.productId);
  expect(productResponse.status()).toBe(200);
  const product = (await productResponse.json()) as ProductDetail;
  expect(product.id).toBe(firstHit.productId);
  expect(product.name).toBe(firstHit.productName);

  // No matches → empty list, not error.
  const emptyResponse = await Actions.searchProducts(request, accessToken, noMatchQuery.term);
  expect(emptyResponse.status()).toBe(200);
  const empty = (await emptyResponse.json()) as ProductSearchResult;
  expect(empty.total).toBe(0);
  expect(hitsOf(empty)).toHaveLength(0);
});
