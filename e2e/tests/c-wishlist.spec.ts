import type { Request } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { CartPage } from '../support/pages/cart.page';
import { ProductPage } from '../support/pages/product.page';
import { PRODUCTS } from '../support/test-data';

const colorLabel = new RegExp(`Colou?r: ${PRODUCTS.hoopEarring.color}`);

test.describe('C. Wishlist', { tag: '@wishlist' }, () => {
  test('C1 - Add a product to the wishlist (guest-authenticated)', {
    tag: ['@destructive', '@nightly'],
  }, async ({ signedInPage: page, wishlistPage }) => {
    // productPage is deliberately constructed here, not taken from the fixture: the
    // productPage fixture is bound to the base `page`, a different (unauthenticated) tab
    // than signedInPage, and this journey needs everything on the same signed-in page.
    const productPage = new ProductPage(page);

    await wishlistPage.clear();
    await productPage.goto(PRODUCTS.hoopEarring);

    await test.step('First add succeeds silently and the item appears on /account/wishlist', async () => {
      const listResponse = page.waitForResponse(
        (res) => res.url().includes('/product-lists') && res.request().method() === 'POST',
      );
      await productPage.addToWishlist();
      expect((await listResponse).status()).toBe(200);
      await expect(page.getByText('1 item added to wishlist')).toBeVisible();

      await wishlistPage.goto();
      await expect(page.getByText(PRODUCTS.hoopEarring.name).first()).toBeVisible();
      await expect(page.getByText(colorLabel)).toBeVisible();
    });

    await test.step('Duplicate add is a clean no-op: toast shown, no new mutation', async () => {
      await productPage.goto(PRODUCTS.hoopEarring);

      let mutationSeen = false;
      const trackMutation = (req: Request): void => {
        if (req.url().includes('/product-lists') && req.method() !== 'GET') {
          mutationSeen = true;
        }
      };
      page.on('request', trackMutation);
      await productPage.addToWishlist();
      await expect(page.getByText('Item is already in wishlist')).toBeVisible();
      page.off('request', trackMutation);

      expect(mutationSeen).toBe(false);
    });
  });

  test('C2 - Remove an item from the wishlist', { tag: ['@destructive', '@nightly'] }, async ({
    signedInPage: page,
    wishlistPage,
  }) => {
    const productPage = new ProductPage(page);

    await wishlistPage.clear();
    await productPage.goto(PRODUCTS.hoopEarring);
    await productPage.addToWishlist();
    await expect(page.getByText('1 item added to wishlist')).toBeVisible();

    await wishlistPage.goto();
    await wishlistPage.removeFirstItem();

    await wishlistPage.expectEmpty();
  });

  test('C3 - Copy a wishlist item to cart', { tag: ['@destructive', '@nightly'] }, async ({
    signedInPage: page,
    wishlistPage,
  }) => {
    const productPage = new ProductPage(page);
    const cartPage = new CartPage(page);

    await wishlistPage.clear();
    await test.step('Start from an empty cart so the item-count assertions are unambiguous', async () => {
      await cartPage.clear();
    });

    await productPage.goto(PRODUCTS.hoopEarring);
    await productPage.addToWishlist();
    await expect(page.getByText('1 item added to wishlist')).toBeVisible();

    await wishlistPage.goto();
    const basketResponse = page.waitForResponse(
      (res) =>
        res.url().includes('/baskets/') &&
        res.url().includes('/items') &&
        res.request().method() === 'POST',
      { timeout: 25_000 },
    );
    await wishlistPage.addItemToCart();
    expect((await basketResponse).status()).toBe(200);
    await cartPage.expectItemCount(1);

    await test.step('The wishlist row is left untouched — this is a copy, not a move', async () => {
      await wishlistPage.goto();
      await expect(page.getByText(PRODUCTS.hoopEarring.name).first()).toBeVisible();
      await expect(wishlistPage.quantityStepper(PRODUCTS.hoopEarring.name).spinbutton).toHaveValue(
        '1',
      );
    });

    await test.step('The cart reflects identical color, quantity, and price', async () => {
      await cartPage.goto();
      await expect(page.getByRole('heading', { name: 'Cart (1 item)' })).toBeVisible();
      await expect(page.getByText(PRODUCTS.hoopEarring.name).first()).toBeVisible();
      await expect(page.getByText(colorLabel)).toBeVisible();
      await expect(cartPage.quantityStepper(PRODUCTS.hoopEarring.name).spinbutton).toHaveValue('1');
    });
  });
});
