import type { Page } from '@playwright/test';
import type { PlacedOrder } from './pages/checkout.page';
import { CheckoutPage } from './pages/checkout.page';
import { type ProductRef, ProductPage } from './pages/product.page';
import { PRIMARY_ADDRESS, PRODUCTS, TEST_VISA } from './test-data';
import { proceedToCheckoutFromCartDialog } from './ui/added-to-cart';


export async function addProductAndProceedToCheckout(
  page: Page,
  product: ProductRef,
): Promise<void> {
  const productPage = new ProductPage(page);
  await productPage.goto(product);
  await productPage.selectFirstColorOption();
  await productPage.addToCart();
  await proceedToCheckoutFromCartDialog(page);
}

export async function placeSignedInOrder(
  page: Page,
  product: ProductRef = PRODUCTS.hoopEarring,
): Promise<PlacedOrder> {
  await addProductAndProceedToCheckout(page, product);
  return new CheckoutPage(page).completeFromShippingStep(PRIMARY_ADDRESS, TEST_VISA);
}
