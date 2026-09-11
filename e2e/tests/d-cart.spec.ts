import { expect, test } from '../support/fixtures';
import { accountMenuButton } from '../support/site';
import { PRODUCTS, uniqueEmail, VALID_PASSWORD } from '../support/test-data';
import { expectCartItemCount, gotoCart } from '../support/ui/cart';
import { confirmRemoval } from '../support/ui/removal';
import { quantityStepper } from '../support/ui/quantity-stepper';

test.describe('D. Cart', { tag: '@cart' }, () => {
  test('D1 - Add to cart, adjust quantity, remove', {
    tag: ['@critical', '@destructive', '@nightly'],
  }, async ({ page, productPage }) => {
    await productPage.goto(PRODUCTS.hoopEarring);

    await test.step('Add to Cart shows a confirmation flyout and increments the header badge', async () => {
      const itemsResponse = page.waitForResponse(
        (res) => res.url().includes('/items') && res.request().method() === 'POST',
        { timeout: 25_000 },
      );
      await productPage.addToCart();
      expect((await itemsResponse).status()).toBe(200);

      await page
        .getByRole('dialog')
        .getByRole('link', { name: 'View Cart' })
        .click();
      await expect(page.getByRole('heading', { name: 'Cart (1 item)' })).toBeVisible();
    });

    await test.step('Incrementing quantity re-syncs the line item', async () => {
      const stepper = quantityStepper(page, PRODUCTS.hoopEarring.name);
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
      await page.getByRole('button', { name: 'Remove' }).first().click();
      await confirmRemoval(page);
      expect((await deleteResponse).status()).toBe(200);
      await expectCartItemCount(page, 0);
      await expect(page.getByText('Your cart is empty.')).toBeVisible();
    });
  });

  test('D2 - Guest cart merges into account cart on login', {
    tag: ['@destructive', '@nightly'],
  }, async ({ page, registerPage, productPage, loginPage }) => {
    const email = uniqueEmail('cart-merge');
    await registerPage.register({
      firstName: 'Cuj',
      lastName: 'Merge',
      email,
      password: VALID_PASSWORD,
    });
    await expect(page.getByRole('button', { name: 'Log Out' })).toBeVisible();
    await page.getByRole('button', { name: 'Log Out' }).click();
    await expect(accountMenuButton(page)).toHaveCount(0);

    await productPage.goto(PRODUCTS.hoopEarring);
    await productPage.addToCart();
    await page
      .getByRole('dialog')
      .getByRole('link', { name: 'View Cart' })
      .click();
    await expect(page.getByRole('heading', { name: 'Cart (1 item)' })).toBeVisible();

    const mergeResponse = page.waitForResponse((res) =>
      res.url().includes('/baskets/actions/merge'),
    );
    await loginPage.loginWithPassword(email, VALID_PASSWORD);
    expect((await mergeResponse).status()).toBe(200);

    await gotoCart(page);
    await expect(page.getByRole('heading', { name: 'Cart (1 item)' })).toBeVisible();
    await expect(page.getByText(PRODUCTS.hoopEarring.name).first()).toBeVisible();
  });
});
