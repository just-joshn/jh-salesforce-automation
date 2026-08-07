import type { APIRequestContext } from '@playwright/test';
import type { EinsteinRecommendations } from '../../support/einstein';
import { fetchRecommendations } from '../../support/einstein';
import { bearer, withSite } from '../../support/scapi';
import type { Product, ProductResult } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import * as Endpoints from './recommendation-discovery.endpoints';

export interface ShopperCredentials {
  email: string;
  password: string;
}

export interface RecommendationZone {
  recommenderName: string;
  title: string;
}

export interface RecommendationSeed extends EinsteinRecommendations {
  masterId: string;
}

export interface EinsteinImpressionBody {
  __recoUUID: string;
  recommenderName: string;
  products: { id: string }[];
}

export interface EinsteinClickBody {
  __recoUUID: string;
  recommenderName: string;
  product: { id: string };
}

export interface WishlistListBody {
  name: string;
  type: 'wish_list';
  public: boolean;
}

export interface WishlistItemBody {
  type: 'product';
  productId: string;
  quantity: number;
  priority: number;
  public: boolean;
}

export interface WishlistResource {
  id?: string;
  type?: string;
}

export interface WishlistResultResource {
  data?: WishlistResource[];
}

export interface WishlistItemResource {
  id?: string;
  productId?: string;
  product?: Product;
}

export const password = 'Test1234!';

export const newCredentials = (): ShopperCredentials => ({
  email: `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`,
  password,
});

export const zone: RecommendationZone = {
  recommenderName: 'pdp-similar-items',
  title: 'You might also like',
};

export const impressionActivity = 'viewReco';
export const clickActivity = 'clickReco';

const preferredMasterId = '25591139M';
const seedSearch = 'shirt';
const seedSearchLimit = '10';

interface SearchResult {
  hits?: { productId?: string }[];
}

const seedCandidates = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<string[]> => {
  const response = await request.get(Endpoints.productSearch(), {
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

export const provisionCustomer = async (
  request: APIRequestContext,
  credentials: ShopperCredentials,
): Promise<void> => {
  const { accessToken } = await getGuestToken(request);
  const created = await request.post(Endpoints.customers(), {
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

export const impressionBody = (
  recommendations: RecommendationSeed,
  recoUUID: string,
): EinsteinImpressionBody => ({
  __recoUUID: recoUUID,
  recommenderName: recommendations.recommenderName,
  products: recommendations.recommendedIds.map((id) => ({ id })),
});

export const clickBody = (
  recommendations: RecommendationSeed,
  recoUUID: string,
  productId: string,
): EinsteinClickBody => ({
  __recoUUID: recoUUID,
  recommenderName: recommendations.recommenderName,
  product: { id: productId },
});

export const hydratedProducts = (result: ProductResult): Product[] => result.data;

export const everyHydratedProductWasRecommended = (
  products: Product[],
  recommendedIds: string[],
): boolean =>
  products.length > 0 && products.every((product) => recommendedIds.includes(product.id));

export const firstRankedRecommendation = (seed: RecommendationSeed): string => {
  const [first] = seed.recommendedIds;
  if (first === undefined) throw new Error('Einstein returned no first-ranked recommendation');
  return first;
};

export const wishlistListBody: WishlistListBody = {
  name: 'Wishlist',
  type: 'wish_list',
  public: false,
};

export const wishlistItemBody = (productId: string): WishlistItemBody => ({
  type: 'product',
  productId,
  quantity: 1,
  priority: 1,
  public: false,
});

export const existingWishlist = (result: WishlistResultResource): WishlistResource | undefined =>
  result.data?.find((list) => list.type === 'wish_list');

export const skipReason =
  `Einstein recommender "${zone.recommenderName}" returned no recommendations for any candidate ` +
  `product, so the personalized-recommendation journey does not exist on this store right now`;
