import type { APIRequestContext, Request } from '@playwright/test';
import type { UiOrderableVariant } from '../../../api/support/products';
import { findUiVariantOnMaster } from '../../../api/support/products';
import { bearer, shopperApiUrl, withSite } from '../../../api/support/scapi';
import { getGuestToken } from '../../../api/support/slas';

/**
 * A product that puts a bonus discount line item in the basket, plus what that
 * line item entitles the shopper to. Resolved against the commerce API, because
 * a bonus entitlement only exists once a qualifying product is in a basket.
 */
export interface BonusEntitlement {
  qualifier: UiOrderableVariant;
  promotionId: string;
  /** How many bonus items the promotion allows: the allowance to stay inside. */
  maxBonusItems: number;
  /** Merchant wording the cart and the chooser both render. */
  calloutMsg: string;
}

interface BonusDiscountLineItem {
  id?: string;
  promotionId?: string;
  maxBonusItems?: number;
}

interface BasketResource {
  basketId?: string;
  bonusDiscountLineItems?: BonusDiscountLineItem[];
}

interface PromotionEntry {
  promotionId?: string;
  calloutMsg?: string;
}

interface SearchHit {
  productId?: string;
  productPromotions?: PromotionEntry[];
}

interface SearchResult {
  hits?: SearchHit[];
}

interface BonusPromotion {
  promotionId: string;
  calloutMsg: string;
}

const BASKETS = 'checkout/shopper-baskets/v2';
const SEARCH = 'search/shopper-search/v1';

const CANDIDATE_LIMIT = '24';

// Terms wide enough to surface a product one of the store's bonus promotions
// advertises; only the promotion id is taken from them.
const promotionSearches = ['top', 'shirt'];

// How many qualifying products to try per promotion. The qualifying list arrives
// already narrowed to that promotion, so the answer is in the first few.
const MAX_QUALIFIERS = 3;

// Callout wording a bonus-product promotion uses, as opposed to a price cut.
const bonusCalloutPattern = /bonus|free|get \d/i;

// `refine` repeats for each refinement, so it is appended rather than set.
const productSearchUrl = (params: Record<string, string>, refinements: string[]): string => {
  const url = new URL(shopperApiUrl(SEARCH, 'product-search'));
  for (const [key, value] of Object.entries(withSite(params))) url.searchParams.set(key, value);
  for (const refinement of refinements) url.searchParams.append('refine', refinement);
  return url.toString();
};

/**
 * A store fault must never read as "this journey does not apply here", so a
 * server error is raised rather than folded into an empty result. The retries in
 * the Playwright config then absorb a passing blip on the shared demo store.
 */
const searchResult = async (
  request: APIRequestContext,
  accessToken: string,
  params: Record<string, string>,
  refinements: string[] = [],
): Promise<SearchResult> => {
  const response = await request.get(productSearchUrl(params, refinements), {
    headers: bearer(accessToken),
  });
  if (response.status() >= 500) {
    throw new Error(
      `Shopper Search is failing (${response.status()}): ${await response.text()}; ` +
        'the bonus-product condition could not be established',
    );
  }
  if (!response.ok()) return {};
  return (await response.json()) as SearchResult;
};

const hitIdsOf = (result: SearchResult): string[] => [
  ...new Set(
    (result.hits ?? []).flatMap((hit) => (hit.productId === undefined ? [] : [hit.productId])),
  ),
];

const bonusEntriesOf = (promotions: PromotionEntry[]): [string, string][] =>
  promotions.flatMap((promotion) => {
    const { promotionId, calloutMsg } = promotion;
    if (promotionId === undefined || calloutMsg === undefined) return [];
    if (bonusCalloutPattern.exec(calloutMsg) === null) return [];
    return [[promotionId, calloutMsg]];
  });

/**
 * Bonus promotions the catalog advertises. Search carries each hit's promotions
 * itself, so this needs no second call into Shopper Products, whose response
 * hook on the demo store trips its circuit breaker from time to time.
 */
const bonusPromotions = async (
  request: APIRequestContext,
  accessToken: string,
  term: string,
): Promise<BonusPromotion[]> => {
  const result = await searchResult(request, accessToken, {
    q: term,
    limit: CANDIDATE_LIMIT,
    expand: 'promotions',
  });
  const seen = new Map(
    (result.hits ?? []).flatMap((hit) => bonusEntriesOf(hit.productPromotions ?? [])),
  );
  return [...seen].map(([promotionId, calloutMsg]) => ({ promotionId, calloutMsg }));
};

/**
 * Products that earn the promotion, as opposed to the ones it gives away. Both
 * sides advertise the same promotion, so `pmpt=qualifying` is what tells them
 * apart without putting every candidate through a basket.
 */
const qualifyingMasters = async (
  request: APIRequestContext,
  accessToken: string,
  promotionId: string,
): Promise<string[]> => {
  const result = await searchResult(request, accessToken, { limit: CANDIDATE_LIMIT }, [
    `pmid=${promotionId}`,
    'pmpt=qualifying',
  ]);
  return hitIdsOf(result).slice(0, MAX_QUALIFIERS);
};

/**
 * Add the variant to a throwaway basket and report the bonus discount line item
 * the promotion creates, then discard that basket so the shared demo store keeps
 * no leftovers.
 *
 * Each probe takes its own guest so a candidate that earns nothing cannot use up
 * the next candidate's basket allowance: a shopper may hold only so many baskets
 * at once, and reusing one guest across probes made this resolution flaky.
 */
const bonusLineItemFor = async (
  request: APIRequestContext,
  variantId: string,
  promotionId: string,
): Promise<BonusDiscountLineItem | undefined> => {
  const { accessToken } = await getGuestToken(request);
  const authed = { params: withSite(), headers: bearer(accessToken) };

  const created = await request.post(shopperApiUrl(BASKETS, 'baskets'), { ...authed, data: {} });
  if (!created.ok()) return undefined;
  const basketId = ((await created.json()) as BasketResource).basketId;
  if (basketId === undefined) return undefined;

  const added = await request.post(shopperApiUrl(BASKETS, `baskets/${basketId}/items`), {
    ...authed,
    data: [{ productId: variantId, quantity: 1 }],
  });
  const basket = added.ok() ? ((await added.json()) as BasketResource) : {};
  await request.delete(shopperApiUrl(BASKETS, `baskets/${basketId}`), authed);

  return (basket.bonusDiscountLineItems ?? []).find(
    (entry) => entry.promotionId === promotionId && (entry.maxBonusItems ?? 0) > 0,
  );
};

const entitlementForPromotion = async (
  request: APIRequestContext,
  accessToken: string,
  promotion: BonusPromotion,
): Promise<BonusEntitlement | undefined> => {
  for (const masterId of await qualifyingMasters(request, accessToken, promotion.promotionId)) {
    const qualifier = await findUiVariantOnMaster(request, accessToken, masterId);
    if (qualifier === undefined) continue;
    const line = await bonusLineItemFor(request, qualifier.variantId, promotion.promotionId);
    if (line?.maxBonusItems === undefined) continue;
    return {
      qualifier,
      promotionId: promotion.promotionId,
      maxBonusItems: line.maxBonusItems,
      calloutMsg: promotion.calloutMsg,
    };
  }
  return undefined;
};

/**
 * The journey only exists while a basket promotion hands out a bonus product, so
 * the condition is proven over the commerce API before the browser starts.
 * `undefined` means no promotion on this store produces a bonus discount line
 * item today, which is this journey's condition going unmet.
 */
export const bonusEntitlement = async (
  request: APIRequestContext,
): Promise<BonusEntitlement | undefined> => {
  const { accessToken } = await getGuestToken(request);
  for (const term of promotionSearches) {
    for (const promotion of await bonusPromotions(request, accessToken, term)) {
      const found = await entitlementForPromotion(request, accessToken, promotion);
      if (found !== undefined) return found;
    }
  }
  return undefined;
};

// --- Wording the cart and the chooser render for the entitlement ---

export const allowanceLabel = (calloutMsg: string, selected: number, max: number): string =>
  `${calloutMsg} (${selected} of ${max} selected)`;

export const chooserTitle = (selected: number, max: number): string =>
  `Select bonus product (${selected} of ${max} selected)`;

export const freeLabel = 'Free';
export const bonusGroupTitle = 'Bonus Products';
export const freePrice = '$0.00';

// --- Reading the storefront's own traffic, to place each step on a service ---

const pathOf = (request: Request): string => new URL(request.url()).pathname;
const queryOf = (request: Request): URLSearchParams => new URL(request.url()).searchParams;

/**
 * Shopper Search: how the chooser resolves which products the promotion allows.
 * `pmid` names the promotion and `pmpt=bonus` asks for its giveaway side, which
 * is what makes a rule-based entitlement enumerable at all.
 */
export const eligibleProductsCall =
  (promotionId: string) =>
  (request: Request): boolean => {
    if (request.method() !== 'GET') return false;
    if (!pathOf(request).endsWith('/product-search')) return false;
    const refinements = queryOf(request).getAll('refine');
    return refinements.includes(`pmid=${promotionId}`) && refinements.includes('pmpt=bonus');
  };

const singleProductPath = /\/products\/[^/]+$/;

/** Shopper Products: the call that hydrates whichever bonus product was chosen. */
export const bonusProductHydrationCall = (request: Request): boolean =>
  request.method() === 'GET' &&
  pathOf(request).includes('/product/shopper-products/v1/') &&
  singleProductPath.exec(pathOf(request)) !== null;

/** Shopper Baskets V2: the write that adds the chosen bonus product. */
export const bonusItemWrite = (request: Request): boolean =>
  request.method() === 'POST' &&
  pathOf(request).includes('/checkout/shopper-baskets/v2/') &&
  pathOf(request).endsWith('/items');

export interface BonusItemPayload {
  productId: string;
  quantity: number;
  bonusDiscountLineItemId?: string;
}

/**
 * What the storefront sent to add the bonus product. Reading it back is how the
 * chosen variant becomes known without the test guessing which candidate the
 * chooser happened to list first.
 */
export const bonusItemPayload = (request: Request): BonusItemPayload => {
  const lines = JSON.parse(request.postData() ?? '[]') as BonusItemPayload[];
  const [line] = lines;
  if (line?.productId === undefined) {
    throw new Error(`the basket write carried no product: ${request.postData() ?? 'no body'}`);
  }
  return line;
};

export const skipReason =
  'no promotion on this store put a bonus discount line item in a basket, so the earned-bonus-product ' +
  'journey does not exist here right now';
