import { CheckoutPage } from '../pages/checkout.page';
import { LoginPage } from '../pages/login.page';
import { OrderHistoryPage } from '../pages/order-history.page';
import { ProductPage } from '../pages/product.page';
import { RegisterPage } from '../pages/register.page';
import { lifecycleTest } from './lifecycle';

type PageObjectFixtures = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  productPage: ProductPage;
  checkoutPage: CheckoutPage;
  orderHistoryPage: OrderHistoryPage;
};

export const test = lifecycleTest.extend<PageObjectFixtures>({
  loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
  registerPage: async ({ page }, use) => { await use(new RegisterPage(page)); },
  productPage: async ({ page }, use) => { await use(new ProductPage(page)); },
  checkoutPage: async ({ page }, use) => { await use(new CheckoutPage(page)); },
  orderHistoryPage: async ({ signedInPage }, use) => { await use(new OrderHistoryPage(signedInPage)); },
});
