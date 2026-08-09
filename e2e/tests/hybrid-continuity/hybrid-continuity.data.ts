import { env } from '../../../config/env';
import type { OrderableVariant } from '../../../api/support/products';

export interface SfraRouteCandidate {
  readonly action: string;
  readonly controller: string;
  readonly expectedHtmlMarker: string;
}

export type SfraAvailability =
  | { readonly kind: 'available'; readonly url: string }
  | { readonly kind: 'absent'; readonly reason: string };

export interface PwaJourneyProduct {
  readonly name: string;
  readonly path: string;
}

export interface ShopperSession {
  readonly dwsid: string | null;
  readonly slasAccessToken: string | null;
  readonly usid: string | null;
}

export const sfraRouteCandidates: readonly SfraRouteCandidate[] = Object.freeze([
  Object.freeze({
    action: 'Show',
    controller: 'Home',
    expectedHtmlMarker: 'data-action="Home-Show"',
  }),
  Object.freeze({
    action: 'Show',
    controller: 'Cart',
    expectedHtmlMarker: 'data-action="Cart-Show"',
  }),
  Object.freeze({
    action: 'Show',
    controller: 'Login',
    expectedHtmlMarker: 'data-action="Login-Show"',
  }),
]);

export const pwaPaths = Object.freeze({ cart: '/cart', home: '/' });

export const sfraRouteUrl = (candidate: SfraRouteCandidate): string =>
  new URL(
    `/on/demandware.store/Sites-${env.SFCC_SITE_ID}-Site/en_US/${candidate.controller}-${candidate.action}`,
    env.E2E_BASE_URL,
  ).toString();

export const toPwaJourneyProduct = (variant: OrderableVariant): PwaJourneyProduct => ({
  name: variant.productName,
  path: `/product/${encodeURIComponent(variant.variantId)}`,
});
