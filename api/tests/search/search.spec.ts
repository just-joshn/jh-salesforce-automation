import { expect, test } from '@playwright/test';
import { getGuestToken } from '../../support/slas';
import * as Actions from './search.actions';
import type { ProductDetail, ProductSearchResult } from './search.data';
import { commonQuery, noMatchQuery } from './search.data';

// Search returns matching products that open to the same item; a no-match query returns empty, not an error.
test('search returns matching products that open correctly; a no-match search is empty', async ({
  request,
}) => {
  const { accessToken } = await getGuestToken(request);

  // a common term should return matches
  const response = await Actions.searchProducts(request, accessToken, commonQuery.term);
  expect(response.status()).toBe(200);
  const result = (await response.json()) as ProductSearchResult;
  expect(result.total).toBeGreaterThan(0);
  const hits = result.hits ?? [];
  expect(hits.length).toBeGreaterThan(0);

  // each hit has an id, a name, a price, and a stock flag
  for (const hit of hits) {
    expect(hit.productId).toBeTruthy();
    expect(hit.productName).toBeTruthy();
  }
  expect(hits.some((hit) => typeof hit.price === 'number' && hit.price > 0)).toBe(true);
  const firstHit = hits[0];
  if (!firstHit) throw new Error('expected at least one search hit');
  expect(typeof firstHit.orderable).toBe('boolean');

  // the first hit opens to the matching product
  const productResponse = await Actions.getProduct(request, accessToken, firstHit.productId);
  expect(productResponse.status()).toBe(200);
  const product = (await productResponse.json()) as ProductDetail;
  expect(product.id).toBe(firstHit.productId);
  expect(product.name).toBe(firstHit.productName);

  // a valid but unmatched term returns an empty result, not an error
  const emptyResponse = await Actions.searchProducts(request, accessToken, noMatchQuery.term);
  expect(emptyResponse.status()).toBe(200);
  const empty = (await emptyResponse.json()) as ProductSearchResult;
  expect(empty.total).toBe(0);
  expect(empty.hits ?? []).toHaveLength(0);
});
