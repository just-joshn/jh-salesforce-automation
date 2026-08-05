import { expect, test } from '../../../support/fixtures';
import * as Actions from './wishlist.actions';
import {
  colorLabel,
  newCredentials,
  orderableVariant,
  provisionCustomer,
  sizeLabel,
} from './wishlist.data';
import * as Locators from './wishlist.locators';

// CUJ 8 — Save product for later: a registered shopper picks the wishlist
// action on the product surface and the chosen variant lands in the customer
// product list, hydrated back with current product details on the wishlist
// page (Shopper Customers + Shopper Products).
test('save a product for later in the wishlist', async ({ page, request }) => {
  test.setTimeout(120000);
  const credentials = newCredentials();

  await provisionCustomer(request, credentials);
  const variant = await orderableVariant(request);

  await Actions.signInShopper(page, credentials);
  await expect(Locators.logout(page).first()).toBeAttached();
  await Actions.ensureWishlistReady(page);

  await Actions.openProduct(page, variant.masterId);
  await expect(Locators.productDetail(page)).toBeVisible({ timeout: 30000 });
  await Actions.selectColor(page, variant.colorName);
  await Actions.selectSize(page, variant.sizeName);
  await Actions.addCurrentProductToWishlist(page);

  await Actions.openWishlist(page);
  await expect(Locators.itemHeading(page, variant.productName)).toBeVisible({ timeout: 20000 });
  await expect(Locators.itemDetail(page, colorLabel(variant.colorName))).toBeVisible();
  await expect(Locators.itemDetail(page, sizeLabel(variant.sizeName))).toBeVisible();

  // A fully-chosen variant offers direct basket creation from the list.
  await expect(Locators.itemAddToCart(page)).toBeVisible();
});

// CUJ 9 — Resume purchase from wishlist: a returning shopper opens the saved
// master product, resolves its options in the View Options modal, and the
// correct variant enters the active basket (Shopper Customers + Shopper
// Products + Shopper Baskets).
test('resume a purchase from the wishlist', async ({ page, request }) => {
  test.setTimeout(120000);
  const credentials = newCredentials();

  await provisionCustomer(request, credentials);
  const variant = await orderableVariant(request);

  await Actions.signInShopper(page, credentials);
  await expect(Locators.logout(page).first()).toBeAttached();
  await Actions.ensureWishlistReady(page);

  // Save without completing variant selection so the master product is stored.
  await Actions.openProduct(page, variant.masterId);
  await expect(Locators.productDetail(page)).toBeVisible({ timeout: 30000 });
  await Actions.addCurrentProductToWishlist(page);

  await Actions.openWishlist(page);
  await expect(Locators.itemHeading(page, variant.productName)).toBeVisible({ timeout: 20000 });

  // The master product needs options resolved before it can enter a basket.
  await expect(Locators.viewOptions(page)).toBeVisible({ timeout: 15000 });
  await Actions.openItemOptions(page);
  await expect(Locators.optionsModal(page)).toBeVisible({ timeout: 15000 });

  await Actions.chooseOptions(page, variant);
  await expect(Locators.modalAddToCart(page)).toBeEnabled({ timeout: 15000 });
  await Actions.addOptionsToCart(page);

  await Actions.openCart(page);
  await expect(Locators.cartItem(page, variant.variantId)).toBeVisible({ timeout: 15000 });
});
