import type { Page } from '@playwright/test';
import { type PlacedOrder } from './pages/checkout.page';
import { CheckoutPage } from './pages/checkout.page';
import { type ProductRef, ProductPage } from './pages/product.page';
import { PRIMARY_ADDRESS, PRODUCTS, TEST_VISA } from './test-data';

/**
 * Scenario helpers that compose several page/component objects into one multi-page flow.
 * These don't belong to any single page — they describe a *scenario*, not a screen — so
 * they stay as plain functions rather than being forced onto one class (composition, not
 * a "God object" that owns every page it happens to pass through).
 */

/** PDP -> select a color -> add to cart -> "Proceed to Checkout" from the dialog. */
export async function addProductAndProceedToCheckout(
  page: Page,
  product: ProductRef,
): Promise<void> {
  const productPage = new ProductPage(page);
  await productPage.goto(product);
  await productPage.selectFirstColorOption();
  const addedToCartDialog = await productPage.addToCart();
  await addedToCartDialog.proceedToCheckout();
}

/**
 * Places a minimal order for an already-signed-in shopper (no guest contact-info step).
 * Shared by B9 (order history) and H2 (OMS tracking boundary), which both just need a
 * real, freshly-placed order to inspect rather than exercising checkout itself.
 */
export async function placeSignedInOrder(
  page: Page,
  product: ProductRef = PRODUCTS.hoopEarring,
): Promise<PlacedOrder> {
  await addProductAndProceedToCheckout(page, product);
  return new CheckoutPage(page).completeFromShippingStep(PRIMARY_ADDRESS, TEST_VISA);
}
