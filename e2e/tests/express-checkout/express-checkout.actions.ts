import type { Page } from '@playwright/test';

import { buildPath } from '../../support/site';
import type { ProductSelection } from './express-checkout.data';
import * as Locators from './express-checkout.locators';

export const visitProduct = async (page: Page, product: ProductSelection): Promise<void> => {
  await page.goto(buildPath(`/product/${product.productId}?pid=${product.variantId}`));
};

export const addProductToBasket = async (page: Page): Promise<void> => {
  await Locators.addToCartButton(page).click();
};

export const openCart = async (page: Page): Promise<void> => {
  await Locators.viewCartLink(page).click();
};

export const startCheckout = async (page: Page): Promise<void> => {
  await Locators.proceedToCheckoutLink(page).click();
};

export const invokeExpressPayment = async (page: Page): Promise<void> => {
  await Locators.expressPaymentButton(page).click();
};

export const authorizeWithProvider = async (page: Page): Promise<void> => {
  await Locators.providerAuthorizationButton(page).click();
};

export const prepareBasketAddressAndShipping = async (page: Page): Promise<void> => {
  await Locators.continueToShippingButton(page).click();
};

export const createOrder = async (page: Page): Promise<void> => {
  await Locators.placeOrderButton(page).click();
};

export const processAndConfirmPayment = async (page: Page): Promise<void> => {
  await Locators.confirmationHeading(page).waitFor();
};
