import { expect, test } from '../support/fixtures';
import { accountMenuButton } from '../support/site';
import { PRODUCTS, uniqueEmail, VALID_PASSWORD } from '../support/test-data';
import { gotoCart } from '../support/ui/cart';

test.describe('D. Cart', () => {
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
