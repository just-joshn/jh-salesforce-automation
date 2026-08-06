import type { APIRequestContext } from '@playwright/test';
import { env } from '../../config/env';

// Einstein is a separate service from the shop API: its own host, its own site
// id, and a client id passed as a header instead of a bearer token.

export interface EinsteinRecommendation {
  id: string;
  productName?: string;
}

export interface EinsteinRecommendations {
  recommenderName: string;
  recoUUID?: string;
  recommendedIds: string[];
}

interface RecsResponse {
  recs?: EinsteinRecommendation[];
  recoUUID?: string;
}

export function einsteinRecsPath(recommenderName: string): string {
  return `/v3/personalization/recs/${env.einstein.siteId}/${recommenderName}`;
}

export function einsteinActivityPath(activity: string): string {
  return `/v3/activities/${env.einstein.siteId}/${activity}`;
}

export function einsteinRecsUrl(recommenderName: string): string {
  return `${env.einstein.host}${einsteinRecsPath(recommenderName)}`;
}

/** Data Cloud web events land on the tenant host, keyed by the app source id. */
export function dataCloudEventsPath(): string {
  return `/web/events/${env.dataCloud.appSourceId}/`;
}

/**
 * Ask Einstein what it would recommend beside one product. This is the same call
 * the storefront's recommendation zone makes. An empty list is a valid answer:
 * the recommender has nothing for this product.
 */
export async function fetchRecommendations(
  request: APIRequestContext,
  recommenderName: string,
  productId: string,
): Promise<EinsteinRecommendations> {
  const response = await request.post(einsteinRecsUrl(recommenderName), {
    headers: { 'x-cq-client-id': env.einstein.clientId, 'content-type': 'application/json' },
    data: { products: [{ id: productId }] },
  });
  if (!response.ok()) {
    throw new Error(
      `Einstein recommender ${recommenderName} failed (${response.status()}): ${await response.text()}`,
    );
  }
  const body = (await response.json()) as RecsResponse;
  return {
    recommenderName,
    recoUUID: body.recoUUID,
    recommendedIds: (body.recs ?? []).flatMap((rec) => (rec.id === undefined ? [] : [rec.id])),
  };
}
