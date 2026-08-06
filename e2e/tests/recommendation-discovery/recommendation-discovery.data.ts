import type { APIRequestContext, Request } from '@playwright/test';
import type { EinsteinRecommendations } from '../../../api/support/einstein';
import {
  dataCloudEventsPath,
  einsteinActivityPath,
  einsteinRecsPath,
  fetchRecommendations,
} from '../../../api/support/einstein';
import { bearer, shopperApiUrl, withSite } from '../../../api/support/scapi';
import { getGuestToken } from '../../../api/support/slas';

export interface ShopperCredentials {
  email: string;
  password: string;
}

/**
 * The recommendation zone under test.
 *
 * `recommenderName` is what the storefront asks Einstein for. `title` is the
 * heading that zone renders, and is the only thing separating it from the other
 * zones on the same page.
 */
export interface RecommendationZone {
  recommenderName: string;
  title: string;
}

/** A product whose zone Einstein actually filled, plus what it recommended. */
export interface RecommendationSeed extends EinsteinRecommendations {
  masterId: string;
}

/** One recorded Einstein activity call, e.g. an impression or a click. */
export interface EinsteinActivity {
  activity: string;
  recommenderName?: string;
  recoUUID?: string;
  productIds: string[];
}

/**
 * One recorded Data Cloud interaction out of a batched web-events call. Field
 * names mirror the wire payload: the catalog object is `id`, and the recommender
 * that produced it is `personalizationId`.
 */
export interface DataCloudInteraction {
  interactionName?: string;
  id?: string;
  personalizationId?: string;
  personalizationContextId?: string;
}

export interface RecommendationEvents {
  einstein: EinsteinActivity[];
  dataCloud: DataCloudInteraction[];
}

export const password = 'Test1234!';

// A throwaway shopper per test so parallel runs never share a wishlist.
export const newCredentials = (): ShopperCredentials => ({
  email: `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`,
  password,
});

/**
 * Product-to-product similar items: the zone the demo store keeps populated
 * best, so it is the one worth asserting a full impression/click trail on.
 */
export const zone: RecommendationZone = {
  recommenderName: 'pdp-similar-items',
  title: 'You might also like',
};

// Activity names Einstein records for a recommendation seen and one clicked.
export const impressionActivity = 'viewReco';
export const clickActivity = 'clickReco';

// Data Cloud names the same two moments as catalog interactions.
export const impressionInteraction = 'catalog-object-impression';
export const productViewInteraction = 'catalog-object-view-start';

// Preferred product, then a search for a stand-in if its zone comes back empty.
const preferredMasterId = '25591139M';
const seedSearch = 'shirt';
const seedSearchLimit = '10';

interface SearchResult {
  hits?: { productId?: string }[];
}

interface MasterProduct {
  name?: string;
}

const seedCandidates = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<string[]> => {
  const response = await request.get(shopperApiUrl('search/shopper-search/v1', 'product-search'), {
    params: withSite({ q: seedSearch, limit: seedSearchLimit }),
    headers: bearer(accessToken),
  });
  if (!response.ok()) return [preferredMasterId];
  const result = (await response.json()) as SearchResult;
  const ids = (result.hits ?? []).flatMap((hit) =>
    hit.productId === undefined ? [] : [hit.productId],
  );
  return [preferredMasterId, ...ids.filter((id) => id !== preferredMasterId)];
};

/**
 * The journey only exists when Einstein has recommendations to give, so the
 * condition is checked by asking Einstein directly before the browser starts.
 *
 * `undefined` means the recommender is configured but empty for every candidate,
 * so it has nothing meaningful to offer on this store today.
 */
export const recommendationSeed = async (
  request: APIRequestContext,
): Promise<RecommendationSeed | undefined> => {
  const { accessToken } = await getGuestToken(request);
  for (const masterId of await seedCandidates(request, accessToken)) {
    const recommendations = await fetchRecommendations(request, zone.recommenderName, masterId);
    if (recommendations.recommendedIds.length > 0) return { ...recommendations, masterId };
  }
  return undefined;
};

/** The name Shopper Products holds for a product, used to find it on a page. */
export const productName = async (
  request: APIRequestContext,
  masterId: string,
): Promise<string> => {
  const { accessToken } = await getGuestToken(request);
  const response = await request.get(
    shopperApiUrl('product/shopper-products/v1', `products/${encodeURIComponent(masterId)}`),
    { params: withSite({ allImages: 'false' }), headers: bearer(accessToken) },
  );
  if (!response.ok()) {
    throw new Error(`reading product ${masterId} failed with ${response.status()}`);
  }
  const master = (await response.json()) as MasterProduct;
  if (master.name === undefined) throw new Error(`product ${masterId} has no name`);
  return master.name;
};

export const provisionCustomer = async (
  request: APIRequestContext,
  credentials: ShopperCredentials,
): Promise<void> => {
  const { accessToken } = await getGuestToken(request);
  const created = await request.post(shopperApiUrl('customer/shopper-customers/v1', 'customers'), {
    params: withSite(),
    headers: bearer(accessToken),
    data: {
      customer: {
        firstName: 'Test',
        lastName: 'Portfolio',
        email: credentials.email,
        login: credentials.email,
      },
      password: credentials.password,
    },
  });
  if (!created.ok()) {
    throw new Error(
      `registering ${credentials.email} failed (${created.status()}): ${await created.text()}`,
    );
  }
};

// --- Reading the storefront's own traffic, to place each step on a service ---

const pathOf = (request: Request): string => new URL(request.url()).pathname;

const jsonBody = (request: Request): Record<string, unknown> => {
  try {
    return JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
};

const idsOf = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const id = (entry as { id?: unknown }).id;
    return typeof id === 'string' ? [id] : [];
  });
};

const activityProductIds = (body: Record<string, unknown>): string[] => {
  const many = idsOf(body.products);
  if (many.length > 0) return many;
  return idsOf([body.product]);
};

const stringField = (body: Record<string, unknown>, key: string): string | undefined => {
  const value = body[key];
  return typeof value === 'string' ? value : undefined;
};

/** Einstein: the recommendation request the zone makes when it mounts. */
export const einsteinRecsCall =
  (recommenderName: string) =>
  (request: Request): boolean =>
    request.method() === 'POST' && pathOf(request) === einsteinRecsPath(recommenderName);

export const isEinsteinActivity = (request: Request): boolean =>
  request.method() === 'POST' &&
  pathOf(request).startsWith(einsteinActivityPath('').replace(/\/$/, ''));

export const toEinsteinActivity = (request: Request): EinsteinActivity => {
  const body = jsonBody(request);
  const segments = pathOf(request).split('/');
  return {
    activity: segments[segments.length - 1] ?? '',
    recommenderName: stringField(body, 'recommenderName'),
    recoUUID: stringField(body, '__recoUUID'),
    productIds: activityProductIds(body),
  };
};

export const isDataCloudEvent = (request: Request): boolean =>
  request.method() === 'POST' && pathOf(request) === dataCloudEventsPath();

/**
 * Data Cloud batches its interactions into one base64 form field, so the events
 * only become assertable once that field is decoded.
 */
export const toDataCloudInteractions = (request: Request): DataCloudInteraction[] => {
  const field = (request.postData() ?? '').replace(/^event=/, '');
  try {
    const decoded = Buffer.from(decodeURIComponent(field), 'base64').toString('utf8');
    const batch = JSON.parse(decoded) as { events?: DataCloudInteraction[] };
    return batch.events ?? [];
  } catch {
    return [];
  }
};

/** Shopper Products: the call that turns recommended ids into product records. */
export const productsHydrationCall =
  (recommendedIds: string[]) =>
  (request: Request): boolean => {
    if (request.method() !== 'GET') return false;
    if (!pathOf(request).endsWith('/products')) return false;
    if (!pathOf(request).includes('/product/shopper-products/v1/')) return false;
    const asked = (new URL(request.url()).searchParams.get('ids') ?? '').split(',');
    return asked.some((id) => recommendedIds.includes(id));
  };

/** Shopper Customers: the write that stores one product on the wishlist. */
export const isWishlistItemWrite = (request: Request): boolean =>
  request.method() === 'POST' &&
  pathOf(request).includes('/customer/shopper-customers/v1/') &&
  pathOf(request).includes('/product-lists/') &&
  pathOf(request).endsWith('/items');

// --- Page addresses ---

export const productUrl =
  (masterId: string) =>
  (url: URL): boolean =>
    url.pathname.includes(`/product/${masterId}`);

export const accountUrlPattern = /\/account\/?$/;

/** A tile links to /product/<masterId>, optionally with a colour preselected. */
export const masterIdFromHref = (href: string | null): string => {
  const match = /\/product\/([^/?#]+)/.exec(href ?? '');
  if (match?.[1] === undefined) {
    throw new Error(`a recommended tile did not link to a product: ${href ?? 'no href'}`);
  }
  return match[1];
};

export const skipReason =
  `Einstein recommender "${zone.recommenderName}" returned no recommendations for any candidate ` +
  `product, so the personalized-recommendation journey does not exist on this store right now`;
