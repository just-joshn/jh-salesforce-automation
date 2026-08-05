import { expect, test } from '@playwright/test';
import type { Product, ProductSearchResult } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import * as Actions from './search.actions';
import { commonQuery, firstHit, hitsOf, noMatchQuery } from './search.data';

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
  const topHit = firstHit(result);
  expect(typeof topHit.orderable).toBe('boolean');

  // First hit opens that product.
  const productResponse = await Actions.getProduct(request, accessToken, topHit.productId);
  expect(productResponse.status()).toBe(200);
  const product = (await productResponse.json()) as Product;
  expect(product.id).toBe(topHit.productId);
  expect(product.name).toBe(topHit.productName);

  // No matches → empty list, not error.
  const emptyResponse = await Actions.searchProducts(request, accessToken, noMatchQuery.term);
  expect(emptyResponse.status()).toBe(200);
  const empty = (await emptyResponse.json()) as ProductSearchResult;
  expect(empty.total).toBe(0);
  expect(hitsOf(empty)).toHaveLength(0);
});
