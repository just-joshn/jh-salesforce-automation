import { expect, test } from '../../support/fixtures';
import * as Actions from './recommendation-discovery.actions';
import type {
  DataCloudInteraction,
  EinsteinActivity,
  RecommendationEvents,
} from './recommendation-discovery.data';
import {
  clickActivity,
  einsteinRecsCall,
  impressionActivity,
  impressionInteraction,
  masterIdFromHref,
  newCredentials,
  productName,
  productUrl,
  productViewInteraction,
  productsHydrationCall,
  provisionCustomer,
  recommendationSeed,
  skipReason,
  zone,
} from './recommendation-discovery.data';
import * as Locators from './recommendation-discovery.locators';

const einsteinActivities = (events: RecommendationEvents, activity: string): EinsteinActivity[] =>
  events.einstein.filter(
    (entry) => entry.activity === activity && entry.recommenderName === zone.recommenderName,
  );

const dataCloudImpressions = (events: RecommendationEvents): DataCloudInteraction[] =>
  events.dataCloud.filter(
    (entry) =>
      entry.interactionName === impressionInteraction &&
      entry.personalizationId === zone.recommenderName,
  );

const dataCloudProductViews = (
  events: RecommendationEvents,
  productId: string,
): DataCloudInteraction[] =>
  events.dataCloud.filter(
    (entry) => entry.interactionName === productViewInteraction && entry.id === productId,
  );

/** Waits for the activity to be recorded, then hands it over for inspection. */
const recordedActivity = async (
  events: RecommendationEvents,
  activity: string,
): Promise<EinsteinActivity> => {
  await expect
    .poll(() => einsteinActivities(events, activity).length, { timeout: 30000 })
    .toBeGreaterThan(0);
  const [first] = einsteinActivities(events, activity);
  if (first === undefined) throw new Error(`no Einstein ${activity} activity was recorded`);
  return first;
};

const everyProductWasRecommended = (productIds: string[], recommendedIds: string[]): boolean =>
  productIds.length > 0 && productIds.every((id) => recommendedIds.includes(id));

const everyTileWasRecommended = (hrefs: string[], recommendedIds: string[]): boolean =>
  hrefs.length > 0 &&
  hrefs.every((href) => recommendedIds.some((id) => href.includes(`/product/${id}`)));

// CUJ 16 — Discover product through personalized recommendation: the zone asks
// Einstein for recommendations, Shopper Products turns those ids into rendered
// product records, and both Einstein and Data Cloud record the impression and the
// click that follows (Einstein Recommendations + Shopper Products + Data Cloud).
test('discover and open a product from a personalized recommendation', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);

  const seed = await recommendationSeed(request);
  test.skip(seed === undefined, skipReason);
  if (seed === undefined) return;

  const events = Actions.recordRecommendationEvents(page);
  const asked = page.waitForRequest(einsteinRecsCall(zone.recommenderName), { timeout: 60000 });
  const hydrated = page.waitForRequest(productsHydrationCall(seed.recommendedIds), {
    timeout: 60000,
  });

  await Actions.openProduct(page, seed.masterId);
  await expect(Locators.productDetail(page)).toBeVisible({ timeout: 40000 });

  // Einstein is asked for the zone, and Shopper Products turns the ids it
  // answered with into the product records the zone renders.
  await asked;
  await hydrated;

  // Start of the journey: the zone becomes visible, holding real products.
  await Actions.revealRecommendationZone(page, zone.title);
  await expect(Locators.zoneHeading(page, zone.title)).toBeVisible();
  await expect(Locators.recommendedTiles(page, zone.title)).not.toHaveCount(0);

  // Every rendered tile is a product Einstein recommended, not a filler tile.
  const tileHrefs = await Locators.recommendedTiles(page, zone.title).evaluateAll((tiles) =>
    tiles.map((tile) => tile.getAttribute('href') ?? ''),
  );
  expect(everyTileWasRecommended(tileHrefs, seed.recommendedIds)).toBe(true);

  // The impression is recorded in Einstein against this recommender, carrying the
  // recommendation's own id and only products it recommended.
  const impression = await recordedActivity(events, impressionActivity);
  expect(impression.recoUUID).toBeTruthy();
  expect(everyProductWasRecommended(impression.productIds, seed.recommendedIds)).toBe(true);

  // Data Cloud records the same impression as a catalog interaction.
  await expect
    .poll(() => dataCloudImpressions(events).length, { timeout: 30000 })
    .toBeGreaterThan(0);
  const [interaction] = dataCloudImpressions(events);
  expect(interaction?.personalizationContextId).toBeTruthy();
  expect(seed.recommendedIds).toContain(interaction?.id);

  // The shopper opens the recommended item, and the product page renders it.
  const openedId = await Actions.openRecommendedProduct(page, zone.title);
  expect(seed.recommendedIds).toContain(openedId);
  await expect(page).toHaveURL(productUrl(openedId));
  await expect(Locators.productDetail(page)).toBeVisible({ timeout: 40000 });
  await expect(Locators.productHeading(page, await productName(request, openedId))).toBeVisible({
    timeout: 30000,
  });

  // Success: the click is recorded in Einstein, and Data Cloud records the
  // product view it led to.
  const click = await recordedActivity(events, clickActivity);
  expect(click.productIds).toContain(openedId);
  await expect
    .poll(() => dataCloudProductViews(events, openedId).length, { timeout: 30000 })
    .toBeGreaterThan(0);
});

// CUJ 16, saved rather than opened: the same zone offers the wishlist action, so a
// registered shopper can keep a recommended product for later. That covers the
// journey's optional step and its second success condition (Shopper Customers).
test('save a personalized recommendation to the wishlist', async ({ page, request }) => {
  test.setTimeout(150000);

  const seed = await recommendationSeed(request);
  test.skip(seed === undefined, skipReason);
  if (seed === undefined) return;

  const credentials = newCredentials();
  await provisionCustomer(request, credentials);

  await Actions.signInShopper(page, credentials);
  await expect(Locators.logout(page).first()).toBeAttached();
  await Actions.ensureWishlistReady(page);

  await Actions.openProduct(page, seed.masterId);
  await expect(Locators.productDetail(page)).toBeVisible({ timeout: 40000 });
  await Actions.revealRecommendationZone(page, zone.title);

  // The product about to be saved is whichever one Einstein ranked first.
  const savedId = masterIdFromHref(
    await Locators.recommendedTile(page, zone.title).getAttribute('href'),
  );
  expect(seed.recommendedIds).toContain(savedId);

  await Actions.saveRecommendedProduct(page, zone.title);

  // Success: the recommended product is stored on the shopper's wishlist and
  // comes back hydrated with its current product details.
  await Actions.openWishlist(page);
  await expect(Locators.wishlistItemHeading(page, await productName(request, savedId))).toBeVisible(
    { timeout: 30000 },
  );
});
