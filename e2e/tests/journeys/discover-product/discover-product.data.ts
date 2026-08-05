import type { APIRequestContext } from '@playwright/test';
import type { PromotedUiVariant } from '../../../../api/support/products';
import { findPromotedUiVariant } from '../../../../api/support/products';
import { getGuestToken } from '../../../../api/support/slas';

export interface DiscoveryQuery {
  term: string;
}

// Search word with plenty of hits, some of them on promotion.
export const discoveryQuery: DiscoveryQuery = { term: 'shirt' };

// Search picks the product; the product call says what the page should show and
// which size can actually be bought. Nothing is hardcoded: demo stock moves.
export const promotedProduct = async (request: APIRequestContext): Promise<PromotedUiVariant> => {
  const { accessToken } = await getGuestToken(request);
  return findPromotedUiVariant(request, accessToken, discoveryQuery.term);
};

export const searchResultsUrl =
  (term: string) =>
  (url: URL): boolean =>
    url.pathname.endsWith('/search') && url.searchParams.get('q') === term;

export const productUrl =
  (masterId: string) =>
  (url: URL): boolean =>
    url.pathname.includes(`/product/${masterId}`);

// Picking a color and a size puts that exact sellable id in the address bar.
export const selectedVariantUrl =
  (variantId: string) =>
  (url: URL): boolean =>
    url.searchParams.get('pid') === variantId;

const escapeForRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The page shows one of the product's promotion messages, not always the first.
export const calloutPattern = (calloutMessages: string[]): RegExp =>
  new RegExp(calloutMessages.map(escapeForRegExp).join('|'));
