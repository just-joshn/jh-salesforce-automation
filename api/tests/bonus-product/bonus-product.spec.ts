import { expect, test } from '@playwright/test';
import { required } from '../../support/scapi';
import type { Basket, Product, ProductSearchResult } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import * as Actions from './bonus-product.actions';
import {
  bonusEntitlement,
  bonusItemPayload,
  bonusVariant,
  candidatePromotion,
  claimedBonusLines,
  entitlementLine,
  firstEligibleCandidate,
  hydratedPromotionCallout,
  lineForProduct,
  linePrice,
  remainingAllowance,
  skipReason,
} from './bonus-product.data';

// CUJ 17 — Claim earned bonus product, through Shopper Baskets, Search, and Products.
test('claim a bonus product earned by a basket promotion', async ({ request }) => {
  test.setTimeout(150000);

  const entitlement = await bonusEntitlement(request);
  test.skip(entitlement === undefined, skipReason);
  if (entitlement === undefined) return;

  // Fresh journey guest. Probe guests are never reused after their throwaway baskets.
  const { accessToken } = await getGuestToken(request);
  const { qualifier, promotionId, maxBonusItems, calloutMsg } = entitlement;

  const created = await Actions.createBasket(request, accessToken);
  expect(created.status()).toBe(200);
  const basketId = required(((await created.json()) as Basket).basketId, 'basketId');

  const qualifiedResponse = await Actions.addQualifier(
    request,
    accessToken,
    basketId,
    qualifier.variantId,
  );
  expect(qualifiedResponse.status()).toBe(200);
  const qualified = (await qualifiedResponse.json()) as Basket;
  expect(lineForProduct(qualified, qualifier.variantId).quantity).toBe(1);

  // Replaces cart item, allowance-heading, chooser-button, and zero-bonus-line assertions.
  const beforeEntitlement = entitlementLine(qualified, promotionId);
  const entitlementId = required(beforeEntitlement.id, 'bonusDiscountLineItems.id');
  expect(beforeEntitlement.maxBonusItems).toBe(maxBonusItems);
  // Shopper Baskets exposes entitlement id and allowance, not the rendered callout; the exact
  // promotion callout is asserted below from Search and hydrated Shopper Products records.
  expect(calloutMsg).toBeTruthy();
  expect(remainingAllowance(qualified, beforeEntitlement)).toBe(maxBonusItems);
  expect(claimedBonusLines(qualified, entitlementId)).toHaveLength(0);

  // Replaces opening chooser and observing its bonus-promotion-products search request.
  const eligibleResponse = await Actions.getEligibleBonusProducts(
    request,
    accessToken,
    promotionId,
  );
  expect(eligibleResponse.status()).toBe(200);
  const eligible = (await eligibleResponse.json()) as ProductSearchResult;
  const candidate = firstEligibleCandidate(eligible);
  expect(candidatePromotion(candidate, promotionId).calloutMsg).toContain(calloutMsg);

  // Replaces selecting first chooser candidate and observing Shopper Products hydration.
  const hydrationResponse = await Actions.hydrateBonusProduct(
    request,
    accessToken,
    candidate.productId,
  );
  expect(hydrationResponse.status()).toBe(200);
  const hydrated = (await hydrationResponse.json()) as Product;
  expect(hydrated.id).toBe(candidate.productId);
  expect(hydratedPromotionCallout(hydrated, promotionId)).toContain(calloutMsg);

  // Replaces selecting size, stepping quantity up then down, and seeing Add to Cart enabled.
  const selectedVariant = await bonusVariant(request, accessToken, hydrated);
  const payload = bonusItemPayload(selectedVariant.variantId, entitlementId);
  expect(payload.bonusDiscountLineItemId).toBeTruthy();
  expect(payload.quantity).toBe(1);

  const addedResponse = await Actions.addBonusItem(request, accessToken, basketId, payload);
  expect(addedResponse.status()).toBe(200);

  const basketResponse = await Actions.getBasket(request, accessToken, basketId);
  expect(basketResponse.status()).toBe(200);
  const completed = (await basketResponse.json()) as Basket;

  // Replaces bonus group, tile, free-price, and "1 of max selected" cart assertions.
  const bonusLine = lineForProduct(completed, selectedVariant.variantId);
  expect(bonusLine.bonusDiscountLineItemId).toBe(entitlementId);
  expect(linePrice(bonusLine)).toBe(0);
  const afterEntitlement = entitlementLine(completed, promotionId);
  expect(afterEntitlement.maxBonusItems).toBe(maxBonusItems);
  expect(remainingAllowance(completed, afterEntitlement)).toBe(maxBonusItems - 1);

  const claimed = claimedBonusLines(completed, entitlementId).length;
  expect(claimed).toBe(1);
  expect(claimed).toBeLessThanOrEqual(maxBonusItems);
});
