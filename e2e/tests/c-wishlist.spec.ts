import { expect, test } from '../support/fixtures';
import { ProductPage } from '../support/pages/product.page';
import { expectCartItemCount, gotoCart } from '../support/ui/cart';
import { openPath } from '../support/site';
import { PRODUCTS } from '../support/test-data';

const colorLabel = new RegExp(`Colou?r: ${PRODUCTS.hoopEarring.color}`);

test.describe('C. Wishlist', () => {
  test('C3 - Copy a wishlist item to cart', { tag: ['@destructive', '@nightly'] }, async ({ signedInPage: page }) => {
    const productPage = new ProductPage(page);
    await openPath(page, '/account/wishlist');
    await gotoCart(page);
    const removeButton = page.getByRole('button', { name: 'Remove' }).first();
    const emptyCart = page.getByText('Your cart is empty.');
    await expect(removeButton.or(emptyCart).first()).toBeVisible();
    while (await removeButton.isVisible()) {
      await removeButton.click();
      const confirmButton = page.getByRole('button', { name: /^Yes, remove/i });
      await expect(confirmButton.or(emptyCart).first()).toBeVisible({ timeout: 3000 });
      if (!(await emptyCart.isVisible())) {
        await confirmButton.click();
        await expect(confirmButton).toBeHidden();
      }
    }
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
    await expect(page.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue('1');
    await gotoCart(page);
    await expect(page.getByRole('heading', { name: /^Cart \(\d+ items?\)$/ })).toBeVisible();
    await expect(page.getByText(PRODUCTS.hoopEarring.name).first()).toBeVisible();
    await expect(page.getByText(colorLabel)).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue('1');
  });
});
