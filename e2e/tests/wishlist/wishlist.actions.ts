import type { Page, Response } from '@playwright/test';
import { buildPath } from '../../support/site';
import * as Login from '../login/login.actions';
import type { ShopperCredentials } from './wishlist.data';
import { accountUrlPattern } from './wishlist.data';
import * as Locators from './wishlist.locators';

// Sign in through the real login form. The login module owns those selectors.
export const signInShopper = async (page: Page, credentials: ShopperCredentials): Promise<void> => {
  await Login.openLogin(page);
  await Login.signIn(page, credentials);
  await page.waitForURL(accountUrlPattern, { timeout: 20000 });
};

// Visiting the wishlist while signed in forces Shopper Customers to create the
// wish_list product list before any item write. Without it, the product-page
// heart can fire createCustomerProductListItem before listId exists, and that
// race leaves an empty wishlist.
export const ensureWishlistReady = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/account/wishlist'));
  await Locators.wishlistHeading(page).waitFor({ state: 'visible', timeout: 20000 });
  await Locators.wishlistSkeleton(page).waitFor({ state: 'hidden', timeout: 20000 });
  // Empty is the expected first-visit state for a fresh throwaway shopper.
  await Locators.emptyWishlist(page).waitFor({ state: 'visible', timeout: 20000 });
};

export const openProduct = async (page: Page, masterId: string): Promise<void> => {
  await page.goto(buildPath(`/product/${masterId}`));
};

// A color change rebuilds the sizes, so this click gets a longer timeout.
export const selectColor = async (page: Page, color: string): Promise<void> => {
  await Locators.colorOption(page, color).click({ timeout: 30000 });
};

export const selectSize = async (page: Page, size: string): Promise<void> => {
  await Locators.sizeOption(page, size).click({ timeout: 30000 });
};

// Only the item write proves the product is stored. Matching any product-lists
// POST also catches list creation and produces a false success.
const isProductListItemWrite = (response: Response): boolean => {
  if (response.request().method() !== 'POST') return false;
  if (!response.ok()) return false;
  const url = response.url();
  return (
    url.includes('/customer/shopper-customers/v1/') &&
    url.includes('/product-lists/') &&
    url.includes('/items')
  );
};

// The server-rendered button is clickable before hydration attaches its
// handler, and a click that lands in that gap is silently dropped. Re-click
// until the product-list *item* write and the toast both confirm storage.
export const addCurrentProductToWishlist = async (page: Page): Promise<void> => {
  await Locators.addToWishlist(page).waitFor({ state: 'visible', timeout: 30000 });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const stored = page.waitForResponse(isProductListItemWrite, { timeout: 10000 });
    await Locators.addToWishlist(page).click();
    try {
      await stored;
      await Locators.wishlistToast(page).waitFor({ state: 'visible', timeout: 5000 });
      return;
    } catch {
      // Click landed before hydration finished, or list was still warming up.
    }
  }
  throw new Error('the product-lists item API never confirmed the wishlist add');
};

export const openWishlist = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/account/wishlist'));
  await Locators.wishlistHeading(page).waitFor({ state: 'visible', timeout: 20000 });
  await Locators.wishlistSkeleton(page).waitFor({ state: 'hidden', timeout: 20000 });
};

export const openItemOptions = async (page: Page): Promise<void> => {
  await Locators.viewOptions(page).click();
};

// Resolve the master product to a sellable variant inside the options modal.
export const chooseOptions = async (
  page: Page,
  selection: { colorName: string; sizeName: string },
): Promise<void> => {
  await Locators.modalColorOption(page, selection.colorName).click({ timeout: 30000 });
  await Locators.modalSizeOption(page, selection.sizeName).click({ timeout: 30000 });
};

export const addOptionsToCart = async (page: Page): Promise<void> => {
  await Locators.modalAddToCart(page).click();
};

export const openCart = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/cart'));
  await Locators.cartContainer(page).waitFor({ timeout: 40000 });
};
