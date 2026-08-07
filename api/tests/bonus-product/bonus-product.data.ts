import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { UiOrderableVariant } from '../../support/products';
import { findUiVariantOnMaster } from '../../support/products';
import { bearer, required, withSite } from '../../support/scapi';
import type {
  Basket,
  BasketProductItem,
  Product,
  ProductSearchHit,
  ProductSearchResult,
} from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import * as Endpoints from './bonus-product.endpoints';

type BonusDiscountLineItem = NonNullable<Basket['bonusDiscountLineItems']>[number];
type ProductPromotion = NonNullable<ProductSearchHit['productPromotions']>[number];
interface SearchResult {
  hits?: ProductSearchHit[];
}

export interface BonusEntitlement {
  qualifier: UiOrderableVariant;
  promotionId: string;
  maxBonusItems: number;
  calloutMsg: string;
}

interface BonusPromotion {
  promotionId: string;
  calloutMsg: string;
}

export interface BonusItemPayload {
  productId: string;
  quantity: number;
  bonusDiscountLineItemId: string;
}

const promotionSearches = ['top', 'shirt'];
const MAX_QUALIFIERS = 3;
const bonusCalloutPattern = /bonus|free|get \d/i;

const searchResult = async (
  request: APIRequestContext,
  accessToken: string,
  url: string,
): Promise<SearchResult> => {
  const response = await request.get(url, { headers: bearer(accessToken) });
  if (response.status() >= 500) {
    throw new Error(
      `Shopper Search is failing (${response.status()}): ${await response.text()}; ` +
        'the bonus-product condition could not be established',
    );
  }
  if (!response.ok()) return {};
  return (await response.json()) as ProductSearchResult;
};

const bonusPromotions = async (
  request: APIRequestContext,
  accessToken: string,
  term: string,
): Promise<BonusPromotion[]> => {
  const result = await searchResult(request, accessToken, Endpoints.advertisedPromotions(term));
  const entries = (result.hits ?? []).flatMap((hit) =>
    (hit.productPromotions ?? []).flatMap((promotion) =>
      bonusCalloutPattern.test(promotion.calloutMsg)
        ? [[promotion.promotionId, promotion.calloutMsg] as const]
        : [],
    ),
  );
  return [...new Map(entries)].map(([promotionId, calloutMsg]) => ({ promotionId, calloutMsg }));
};

const qualifyingMasters = async (
  request: APIRequestContext,
  accessToken: string,
  promotionId: string,
): Promise<string[]> => {
  const result = await searchResult(
    request,
    accessToken,
    Endpoints.qualifyingProducts(promotionId),
  );
  return (result.hits ?? []).slice(0, MAX_QUALIFIERS).map((hit) => hit.productId);
};

const basketFrom = async (
  response: APIResponse,
  operation: string,
): Promise<Basket | undefined> => {
  if (response.status() >= 500) {
    throw new Error(`${operation} failed (${response.status()}): ${await response.text()}`);
  }
  return response.ok() ? ((await response.json()) as Basket) : undefined;
};

// Every promotion probe gets a fresh guest. Reuse exhausts basket allowance and flakes.
const bonusLineItemFor = async (
  request: APIRequestContext,
  variantId: string,
  promotionId: string,
): Promise<BonusDiscountLineItem | undefined> => {
  const { accessToken } = await getGuestToken(request);
  const authed = { params: withSite(), headers: bearer(accessToken) };
  const created = await basketFrom(
    await request.post(Endpoints.baskets(), { ...authed, data: {} }),
    'creating the bonus-product probe basket',
  );
  if (created?.basketId === undefined) return undefined;

  const added = await basketFrom(
    await request.post(Endpoints.basketItems(created.basketId), {
      ...authed,
      data: [{ productId: variantId, quantity: 1 }],
    }),
    'adding the bonus-product probe qualifier',
  );
  await request.delete(Endpoints.basket(created.basketId), authed);
  return added?.bonusDiscountLineItems?.find(
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
    return { qualifier, ...promotion, maxBonusItems: line.maxBonusItems };
  }
  return undefined;
};

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

export const lineForProduct = (basket: Basket, productId: string): BasketProductItem => {
  const line = (basket.productItems ?? []).find((item) => item.productId === productId);
  if (line === undefined) throw new Error(`the basket holds no line for product ${productId}`);
  return line;
};

export const entitlementLine = (basket: Basket, promotionId: string): BonusDiscountLineItem => {
  const line = basket.bonusDiscountLineItems?.find((item) => item.promotionId === promotionId);
  if (line === undefined) throw new Error(`the basket carries no entitlement for ${promotionId}`);
  return line;
};

export const claimedBonusLines = (
  basket: Basket,
  bonusDiscountLineItemId: string,
): BasketProductItem[] =>
  (basket.productItems ?? []).filter(
    (item) => item.bonusDiscountLineItemId === bonusDiscountLineItemId,
  );

export const remainingAllowance = (basket: Basket, line: BonusDiscountLineItem): number =>
  required(line.maxBonusItems, 'maxBonusItems') -
  claimedBonusLines(basket, required(line.id, 'bonusDiscountLineItems.id')).length;

export const candidatePromotion = (
  hit: ProductSearchHit,
  promotionId: string,
): ProductPromotion => {
  const promotion = hit.productPromotions?.find((entry) => entry.promotionId === promotionId);
  if (promotion === undefined) throw new Error(`product ${hit.productId} omitted ${promotionId}`);
  return promotion;
};

export const firstEligibleCandidate = (result: ProductSearchResult): ProductSearchHit => {
  const [candidate] = result.hits ?? [];
  if (candidate === undefined) throw new Error('the promotion returned no eligible bonus products');
  return candidate;
};

export const hydratedPromotionCallout = (product: Product, promotionId: string): string => {
  const promotion = product.productPromotions?.find((entry) => entry.promotionId === promotionId);
  if (promotion === undefined)
    throw new Error(`hydrated product ${product.id} omitted ${promotionId}`);
  return promotion.calloutMsg;
};

export const bonusVariant = async (
  request: APIRequestContext,
  accessToken: string,
  product: Product,
): Promise<UiOrderableVariant> => {
  const masterId = product.master?.masterId ?? product.id;
  const variant = await findUiVariantOnMaster(request, accessToken, masterId);
  if (variant === undefined) throw new Error(`bonus product ${masterId} has no selectable size`);
  return variant;
};

export const bonusItemPayload = (
  productId: string,
  bonusDiscountLineItemId: string,
): BonusItemPayload => ({ productId, bonusDiscountLineItemId, quantity: 1 });

export const linePrice = (line: BasketProductItem): number | undefined =>
  line.priceAfterItemDiscount ?? line.price;

export const skipReason =
  'no promotion on this store put a bonus discount line item in a basket, so the earned-bonus-product ' +
  'journey does not exist here right now';
