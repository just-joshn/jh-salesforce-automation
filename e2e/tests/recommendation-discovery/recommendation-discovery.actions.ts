import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import * as Login from '../login/login.actions';
import type { RecommendationEvents, ShopperCredentials } from './recommendation-discovery.data';
import {
  accountUrlPattern,
  isDataCloudEvent,
  isEinsteinActivity,
  isWishlistItemWrite,
  masterIdFromHref,
  toDataCloudInteractions,
  toEinsteinActivity,
} from './recommendation-discovery.data';
import * as Locators from './recommendation-discovery.locators';

/**
 * Start collecting the personalization traffic the storefront sends for itself.
 * Recording begins before the first navigation, so an impression that fires
 * during hydration is never missed. The returned record grows as the test runs.
 */
export const recordRecommendationEvents = (page: Page): RecommendationEvents => {
  const events: RecommendationEvents = { einstein: [], dataCloud: [] };
  page.on('request', (request) => {
    if (isEinsteinActivity(request)) events.einstein.push(toEinsteinActivity(request));
    if (isDataCloudEvent(request)) events.dataCloud.push(...toDataCloudInteractions(request));
  });
  return events;
};

export const openProduct = async (page: Page, masterId: string): Promise<void> => {
  await page.goto(buildPath(`/product/${masterId}`));
};

// The zone only records an impression once it enters the viewport, so scrolling
// to it is the step that starts this journey.
export const revealRecommendationZone = async (page: Page, title: string): Promise<void> => {
  await Locators.recommendationZone(page, title).scrollIntoViewIfNeeded({ timeout: 30000 });
  await Locators.recommendedTile(page, title).waitFor({ state: 'visible', timeout: 30000 });
};

/** Open the first recommended product and report which product that was. */
export const openRecommendedProduct = async (page: Page, title: string): Promise<string> => {
  const tile = Locators.recommendedTile(page, title);
  const masterId = masterIdFromHref(await tile.getAttribute('href'));
  await tile.click({ timeout: 30000 });
  await page.waitForURL((url) => url.pathname.includes(`/product/${masterId}`), { timeout: 30000 });
  return masterId;
};

export const signInShopper = async (page: Page, credentials: ShopperCredentials): Promise<void> => {
  await Login.openLogin(page);
  await Login.signIn(page, credentials);
  await page.waitForURL(accountUrlPattern, { timeout: 20000 });
};

export const openWishlist = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/account/wishlist'));
  await Locators.wishlistHeading(page).waitFor({ state: 'visible', timeout: 20000 });
  await Locators.wishlistSkeleton(page).waitFor({ state: 'hidden', timeout: 20000 });
};

// Visiting the wishlist while signed in makes Shopper Customers create the
// wish_list product list before any item write. So a heart click cannot race
// list creation and silently store nothing.
export const ensureWishlistReady = async (page: Page): Promise<void> => {
  await openWishlist(page);
  await Locators.emptyWishlist(page).waitFor({ state: 'visible', timeout: 20000 });
};

/**
 * Save the first recommended product from the zone.
 *
 * The server-rendered heart is clickable before hydration attaches its handler,
 * and a click landing in that gap is dropped. So the click repeats until Shopper
 * Customers confirms the write.
 */
export const saveRecommendedProduct = async (page: Page, title: string): Promise<void> => {
  const heart = Locators.recommendedTileWishlist(page, title);
  await Locators.recommendedTile(page, title).hover({ timeout: 30000 });
  await heart.waitFor({ state: 'visible', timeout: 30000 });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const stored = page.waitForRequest(isWishlistItemWrite, { timeout: 10000 });
    await heart.click({ timeout: 30000 });
    try {
      await stored;
      await Locators.wishlistToast(page).waitFor({ state: 'visible', timeout: 5000 });
      return;
    } catch {
      // Click landed before hydration finished, or the list was still warming up.
    }
  }
  throw new Error('the product-lists item API never confirmed the recommended product was saved');
};
