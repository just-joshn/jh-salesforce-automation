import type { Request } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { ProductPage } from '../support/pages/product.page';
import { expectCartItemCount, gotoCart } from '../support/ui/cart';
import { confirmRemoval, drainRemovals } from '../support/ui/removal';
import { quantityStepper } from '../support/ui/quantity-stepper';
import { openPath } from '../support/site';
import { PRODUCTS } from '../support/test-data';

const colorLabel = new RegExp(`Colou?r: ${PRODUCTS.hoopEarring.color}`);

async function clearWishlist(page: import('@playwright/test').Page): Promise<void> {
  await openPath(page, '/account/wishlist');
  await drainRemovals(page, 'Remove', 'No Wishlist Items');
}

test.describe('C. Wishlist', { tag: '@wishlist' }, () => {
  test('C1 - Add a product to the wishlist (guest-authenticated)', { tag: ['@destructive', '@nightly'] }, async ({ signedInPage: page }) => {
    const productPage = new ProductPage(page);
    await clearWishlist(page);
    await productPage.goto(PRODUCTS.hoopEarring);
    const listResponse = page.waitForResponse((res) => res.url().includes('/product-lists') && res.request().method() === 'POST');
    await productPage.addToWishlist();
    expect((await listResponse).status()).toBe(200);
    await expect(page.getByText('1 item added to wishlist')).toBeVisible();
    await openPath(page, '/account/wishlist');
    await expect(page.getByText(PRODUCTS.hoopEarring.name).first()).toBeVisible();
    await expect(page.getByText(colorLabel)).toBeVisible();

    await productPage.goto(PRODUCTS.hoopEarring);
    let mutationSeen = false;
    const trackMutation = (req: Request): void => {
      if (req.url().includes('/product-lists') && req.method() !== 'GET') mutationSeen = true;
    };
    page.on('request', trackMutation);
    await productPage.addToWishlist();
    await expect(page.getByText('Item is already in wishlist')).toBeVisible();
    page.off('request', trackMutation);
    expect(mutationSeen).toBe(false);
  });

  test('C2 - Remove an item from the wishlist', { tag: ['@destructive', '@nightly'] }, async ({ signedInPage: page }) => {
    const productPage = new ProductPage(page);
    await clearWishlist(page);
    await productPage.goto(PRODUCTS.hoopEarring);
    await productPage.addToWishlist();
    await expect(page.getByText('1 item added to wishlist')).toBeVisible();
    await openPath(page, '/account/wishlist');
    await page.getByRole('button', { name: 'Remove' }).first().click();
    await expect(page.getByRole('alertdialog')).toContainText('Confirm Remove Item');
    await confirmRemoval(page);
    await expect(page.getByText('No Wishlist Items')).toBeVisible();
  });

  test('C3 - Copy a wishlist item to cart', { tag: ['@destructive', '@nightly'] }, async ({ signedInPage: page }) => {
    const productPage = new ProductPage(page);
    await clearWishlist(page);
    await gotoCart(page);
    await drainRemovals(page, 'Remove', 'Your cart is empty.');
    await productPage.goto(PRODUCTS.hoopEarring);
    await productPage.addToWishlist();
    await expect(page.getByText('1 item added to wishlist')).toBeVisible();
    await openPath(page, '/account/wishlist');
    const basketResponse = page.waitForResponse((res) => res.url().includes('/baskets/') && res.url().includes('/items') && res.request().method() === 'POST', { timeout: 25_000 });
    await page.getByRole('button', { name: /^Add .+ to cart$/i }).first().click();
    expect((await basketResponse).status()).toBe(200);
    await expectCartItemCount(page, 1);
    await openPath(page, '/account/wishlist');
    await expect(page.getByText(PRODUCTS.hoopEarring.name).first()).toBeVisible();
    await expect(quantityStepper(page, PRODUCTS.hoopEarring.name).spinbutton).toHaveValue('1');
    await gotoCart(page);
    await expect(page.getByRole('heading', { name: 'Cart (1 item)' })).toBeVisible();
    await expect(page.getByText(PRODUCTS.hoopEarring.name).first()).toBeVisible();
    await expect(page.getByText(colorLabel)).toBeVisible();
    await expect(quantityStepper(page, PRODUCTS.hoopEarring.name).spinbutton).toHaveValue('1');
  });
});
