import { expect, test } from '../support/fixtures';
import { PRODUCTS, uniqueEmail, VALID_PASSWORD } from '../support/test-data';

test.describe('D. Cart', { tag: '@cart' }, () => {
  test(
    'D1 - Add to cart, adjust quantity, remove',
    { tag: ['@critical', '@destructive', '@nightly'] },
    async ({ page, productPage, cartPage }) => {
      await productPage.goto(PRODUCTS.hoopEarring);

      await test.step('Add to Cart shows a confirmation flyout and increments the header badge', async () => {
        const itemsResponse = page.waitForResponse(
          (res) => res.url().includes('/items') && res.request().method() === 'POST',
          { timeout: 25_000 },
        );
        const addedToCartDialog = await productPage.addToCart();
        expect((await itemsResponse).status()).toBe(200);

        await addedToCartDialog.viewCart();
        await expect(page.getByRole('heading', { name: 'Cart (1 item)' })).toBeVisible();
      });

      await test.step('Incrementing quantity re-syncs the line item', async () => {
        const stepper = cartPage.quantityStepper(PRODUCTS.hoopEarring.name);
        const patchResponse = page.waitForResponse(
          (res) => res.url().includes('/items/') && res.request().method() === 'PATCH',
        );
        await stepper.increment.click();
        expect((await patchResponse).status()).toBe(200);
        await expect(stepper.spinbutton).toHaveValue('2');
      });

      await test.step('Removing with confirmation empties the cart', async () => {
        const deleteResponse = page.waitForResponse(
          (res) => res.url().includes('/items/') && res.request().method() === 'DELETE',
        );
        await cartPage.removeFirstItem();
        expect((await deleteResponse).status()).toBe(200);
        await cartPage.expectItemCount(0);
        await cartPage.expectEmpty();
      });
    },
  );

  test(
    'D2 - Guest cart merges into account cart on login',
    { tag: ['@destructive', '@nightly'] },
    async ({ page, registerPage, productPage, cartPage, loginPage }) => {
      const email = uniqueEmail('cart-merge');
      await registerPage.register({
        firstName: 'Cuj',
        lastName: 'Merge',
        email,
        password: VALID_PASSWORD,
      });
      await expect(page.getByRole('button', { name: 'Log Out' })).toBeVisible();
      await page.getByRole('button', { name: 'Log Out' }).click();
      await expect(page.getByRole('button', { name: 'Open account menu' })).toHaveCount(0);

      await productPage.goto(PRODUCTS.hoopEarring);
      const addedToCartDialog = await productPage.addToCart();
      await addedToCartDialog.viewCart();
      await expect(page.getByRole('heading', { name: 'Cart (1 item)' })).toBeVisible();

      const mergeResponse = page.waitForResponse((res) =>
        res.url().includes('/baskets/actions/merge'),
      );
      await loginPage.loginWithPassword(email, VALID_PASSWORD);
      expect((await mergeResponse).status()).toBe(200);

      await cartPage.goto();
      await expect(page.getByRole('heading', { name: 'Cart (1 item)' })).toBeVisible();
      await expect(page.getByText(PRODUCTS.hoopEarring.name).first()).toBeVisible();
    },
  );
});
