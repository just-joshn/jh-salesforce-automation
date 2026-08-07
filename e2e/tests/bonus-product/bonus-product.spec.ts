import { expect, test } from '../../support/fixtures';
import * as Actions from './bonus-product.actions';
import {
  allowanceLabel,
  bonusEntitlement,
  bonusGroupTitle,
  bonusItemPayload,
  bonusItemWrite,
  bonusProductHydrationCall,
  chooserTitle,
  eligibleProductsCall,
  freeLabel,
  freePrice,
  skipReason,
} from './bonus-product.data';
import * as Locators from './bonus-product.locators';

// CUJ 17: Claim earned bonus product.
//
// A basket promotion creates a bonus discount line item. The chooser resolves
// the products that entitlement allows. The chosen one is hydrated, configured,
// and enters the basket as a free bonus line under that promotion.
// Services: Shopper Baskets V2, Shopper Search, Shopper Products.
test('claim a bonus product earned by a basket promotion', async ({ page, request }) => {
  test.setTimeout(150000);

  const entitlement = await bonusEntitlement(request);
  test.skip(entitlement === undefined, skipReason);
  if (entitlement === undefined) return;

  const { qualifier, promotionId, maxBonusItems, calloutMsg } = entitlement;

  // Start of the journey: a qualifying promotion is present in the basket.
  await Actions.addQualifierToCart(page, qualifier);
  await Actions.openCart(page);
  await expect(Locators.cartItem(page, qualifier.variantId)).toBeVisible({ timeout: 30000 });

  // Inspect the basket promotion: the cart states the entitlement and how much
  // of the allowance is still unclaimed.
  await expect(
    Locators.allowanceHeading(page, allowanceLabel(calloutMsg, 0, maxBonusItems)),
  ).toBeVisible({ timeout: 30000 });
  await expect(Locators.selectBonusProducts(page)).toBeVisible();
  await expect(Locators.bonusItems(page)).toHaveCount(0);

  // Retrieve the eligible products. The chooser asks Shopper Search for the
  // promotion's bonus side, which is how a rule-based entitlement is resolved.
  const eligible = page.waitForRequest(eligibleProductsCall(promotionId), { timeout: 60000 });
  await Actions.openBonusChooser(page);
  await eligible;

  await expect(Locators.chooserHeading(page, chooserTitle(0, maxBonusItems))).toBeVisible({
    timeout: 30000,
  });
  await expect(Locators.candidateFreeLabel(page, freeLabel)).toBeVisible();

  // Hydrate the chosen product: picking a candidate loads its own record so its
  // variants can be resolved.
  const hydrated = page.waitForRequest(bonusProductHydrationCall, { timeout: 60000 });
  await Actions.chooseFirstCandidate(page);
  await hydrated;
  await expect(Locators.candidateName(page)).toBeVisible();
  await expect(Locators.candidatePromoCallout(page)).toContainText(calloutMsg);

  // Select quantity and options. The stepper is exercised and returned to one,
  // so the claim stays a single item, well inside the allowance.
  await Actions.selectFirstCandidateSize(page);
  await Actions.raiseCandidateQuantity(page);
  await Actions.lowerCandidateQuantity(page);
  await expect(Locators.candidateAddToCart(page)).toBeEnabled({ timeout: 30000 });

  // Add the bonus line item, and read back which variant the storefront sent.
  const written = page.waitForRequest(bonusItemWrite, { timeout: 60000 });
  await Actions.addChosenBonusProduct(page);
  const payload = bonusItemPayload(await written);

  // The line is added against this promotion's entitlement, not as a plain item.
  expect(payload.bonusDiscountLineItemId).toBeTruthy();
  expect(payload.quantity).toBe(1);

  // Success: the bonus product appears under the promotion, priced at nothing,
  // and the allowance has moved by exactly the one item claimed.
  await Actions.openCart(page);
  await expect(Locators.bonusGroupHeading(page, bonusGroupTitle)).toBeVisible({ timeout: 30000 });
  await expect(Locators.bonusItem(page, payload.productId)).toBeVisible({ timeout: 30000 });
  await expect(Locators.bonusItemPrice(page, payload.productId)).toHaveText(freePrice);

  await expect(
    Locators.allowanceHeading(page, allowanceLabel(calloutMsg, 1, maxBonusItems)),
  ).toBeVisible({ timeout: 30000 });

  // The claim never runs past what the promotion granted.
  const claimed = await Locators.bonusItems(page).count();
  expect(claimed).toBe(1);
  expect(claimed).toBeLessThanOrEqual(maxBonusItems);
});
