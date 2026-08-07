import { expect, test } from '@playwright/test';
import { required } from '../../support/scapi';
import type { ProductResult } from '../../support/scapi-types';
import { getGuestToken, loginRegisteredShopper, requireSession } from '../../support/slas';
import * as Actions from './recommendation-discovery.actions';
import {
  clickBody,
  everyHydratedProductWasRecommended,
  existingWishlist,
  firstRankedRecommendation,
  hydratedProducts,
  impressionBody,
  newCredentials,
  provisionCustomer,
  recommendationSeed,
  skipReason,
  wishlistItemBody,
  wishlistListBody,
  zone,
} from './recommendation-discovery.data';
import type {
  WishlistItemResource,
  WishlistResource,
  WishlistResultResource,
} from './recommendation-discovery.data';

test('discover and open a product from a personalized recommendation', async ({ request }) => {
  test.setTimeout(120000);

  const seed = await recommendationSeed(request);
  test.skip(seed === undefined, skipReason);
  if (seed === undefined) return;

  expect(seed.recommenderName).toBe(zone.recommenderName);
  expect(seed.recommendedIds).not.toHaveLength(0);
  const recoUUID = required(seed.recoUUID, 'Einstein recoUUID');
  expect(recoUUID).toBeTruthy();

  const { accessToken } = await getGuestToken(request);
  const hydrationResponse = await Actions.hydrateProducts(
    request,
    accessToken,
    seed.recommendedIds,
  );
  expect(hydrationResponse.status()).toBe(200);
  const products = hydratedProducts((await hydrationResponse.json()) as ProductResult);
  expect(products.every((product) => product.id.length > 0)).toBe(true);

  // Replaces the assertion that every rendered tile is recommended, never filler.
  expect(everyHydratedProductWasRecommended(products, seed.recommendedIds)).toBe(true);

  const impression = impressionBody(seed, recoUUID);
  expect(impression.__recoUUID).toBeTruthy();
  expect(impression.products.every(({ id }) => seed.recommendedIds.includes(id))).toBe(true);
  const impressionResponse = await Actions.recordImpression(request, accessToken, impression);
  expect(impressionResponse.ok()).toBeTruthy();

  // Replaces e2e Data Cloud catalog-object-impression assertion: Data Cloud web events are
  // browser-emitted and have no shopper-facing API counterpart.

  const openedId = firstRankedRecommendation(seed);
  expect(seed.recommendedIds).toContain(openedId);
  expect(products.some((product) => product.id === openedId)).toBe(true);

  const click = clickBody(seed, recoUUID, openedId);
  expect(click.product.id).toBe(openedId);
  const clickResponse = await Actions.recordClick(request, accessToken, click);
  expect(clickResponse.ok()).toBeTruthy();

  // Replaces e2e Data Cloud catalog-object-view-start assertion: product-view web events are
  // browser-emitted and have no shopper-facing API counterpart.
});

test('save a personalized recommendation to the wishlist', async ({ request }) => {
  test.setTimeout(150000);

  const seed = await recommendationSeed(request);
  test.skip(seed === undefined, skipReason);
  if (seed === undefined) return;

  const credentials = newCredentials();
  await provisionCustomer(request, credentials);
  const login = await loginRegisteredShopper(request, credentials.email, credentials.password);
  const { accessToken, customerId } = requireSession(login, credentials.email);

  const listsResponse = await Actions.getProductLists(request, accessToken, customerId);
  expect(listsResponse.status()).toBe(200);
  const lists = (await listsResponse.json()) as WishlistResultResource;
  let wishlist: WishlistResource | undefined = existingWishlist(lists);
  if (wishlist === undefined) {
    const created = await Actions.createWishlist(
      request,
      accessToken,
      customerId,
      wishlistListBody,
    );
    expect(created.status()).toBe(200);
    wishlist = (await created.json()) as WishlistResource;
  }
  const listId = required(wishlist.id, 'wishlist.id');

  const savedId = firstRankedRecommendation(seed);
  expect(seed.recommendedIds).toContain(savedId);
  const savedResponse = await Actions.addWishlistItem(
    request,
    accessToken,
    customerId,
    listId,
    wishlistItemBody(savedId),
  );
  expect(savedResponse.status()).toBe(200);
  const saved = (await savedResponse.json()) as WishlistItemResource;
  expect(saved.productId).toBe(savedId);

  const hydratedResponse = await Actions.getWishlistItem(
    request,
    accessToken,
    customerId,
    listId,
    required(saved.id, 'wishlist item id'),
  );
  expect(hydratedResponse.status()).toBe(200);
  const hydrated = (await hydratedResponse.json()) as WishlistItemResource;
  expect(hydrated.productId).toBe(savedId);
  expect(hydrated.product?.id).toBe(savedId);
  expect(hydrated.product?.name).toBeTruthy();
});
