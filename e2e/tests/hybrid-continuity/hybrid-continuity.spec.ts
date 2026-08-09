/**
 * Authored-but-unproven: CUJ 14 needs deployment serving both PWA Kit and SFRA routes.
 * OUT OF SCOPE — Step 3: Stale/truncated auth handoff requires hybrid auth handoff to observe.
 * OUT OF SCOPE — Step 4: Shopper appears logged out requires real destination SFRA runtime.
 * OUT OF SCOPE — Step 5: Basket unavailable/different requires real destination SFRA runtime.
 */
import { getGuestToken } from '../../../api/support/slas';
import { findOrderableVariant } from '../../../api/support/products';
import { expect, test } from '../../support/fixtures';
import * as Actions from './hybrid-continuity.actions';
import { toPwaJourneyProduct } from './hybrid-continuity.data';
import * as Locators from './hybrid-continuity.locators';

test('CUJ 14 — preserves shopper session and basket across the hybrid runtime boundary', async ({
  page,
  request,
}) => {
  const availability = await Actions.probeSfraAvailability(page);
  if (availability.kind === 'absent') {
    test.skip(true, availability.reason);
    return;
  }

  const pwaState = await test.step('Establish shopping/session state', async () => {
    const token = await getGuestToken(request);
    const product = toPwaJourneyProduct(
      await findOrderableVariant(request, token.access_token),
    );
    await Actions.buildPwaBasket(page, product);
    await expect(Locators.basketProduct(page, product.name)).toBeVisible();
    return { product, session: await Actions.captureShopperSession(page) };
  });

  await test.step('Navigate across runtime boundary', async () => {
    await Actions.visitSfraRoute(page, availability.url);
    await expect(Locators.storefrontMain(page)).toBeVisible();
  });

  const sfraSession = await test.step('Synchronize auth/session identifiers', async () => {
    const session = await Actions.captureShopperSession(page);
    expect(session.dwsid).toBe(pwaState.session.dwsid);
    expect(session.slasAccessToken).toBe(pwaState.session.slasAccessToken);
    return session;
  });

  await test.step('Restore identity', () => {
    expect(sfraSession.usid).toBe(pwaState.session.usid);
  });

  await test.step('Restore/use basket', async () => {
    await expect(Locators.basketProduct(page, pwaState.product.name)).toBeVisible();
  });

  await test.step('Continue intended task', async () => {
    await Actions.visitPwaHome(page);
    await expect(Locators.storefrontMain(page)).toBeVisible();
  });
});

test('CUJ 14 — serves every storefront route from the PWA Kit runtime on a non-hybrid deployment', async ({
  page,
  request,
}) => {
  const availability = await Actions.probeSfraAvailability(page);
  expect(availability.kind).toBe('absent');

  await Actions.visitPwaCart(page);
  await expect(Locators.emptyBasketMessage(page)).toBeVisible();

  const token = await getGuestToken(request);
  const product = toPwaJourneyProduct(await findOrderableVariant(request, token.access_token));
  await Actions.buildPwaBasket(page, product);
  await expect(Locators.basketProduct(page, product.name)).toBeVisible();

  await Actions.visitPwaHome(page);
  await expect(Locators.storefrontMain(page)).toBeVisible();
  await Actions.visitPwaCart(page);
  await expect(Locators.basketProduct(page, product.name)).toBeVisible();
});
