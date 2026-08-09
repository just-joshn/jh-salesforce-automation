import type { Page } from '@playwright/test';

import { buildPath } from '../../support/site';
import type {
  FirstTimeShopper,
  JourneyProduct,
  PaymentCard,
  ShippingAddress,
} from './one-click-first-time.data';
import * as Locators from './one-click-first-time.locators';

export const visitProduct = async (page: Page, product: JourneyProduct): Promise<void> => {
  await page.goto(buildPath(`/product/${product.productId}?pid=${product.variantId}`));
};

export const addProductToBasket = async (page: Page): Promise<void> => {
  await Locators.cartButtonWithCount(page, 0).waitFor();
  const basketResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/baskets\/[^/]+\/items(?:\?|$)/.test(response.url()),
  );
  await Locators.addToCartButton(page).click();
  const response = await basketResponse;
  if (!response.ok()) {
    throw new Error(`Add-to-cart request failed with HTTP ${response.status()}`);
  }
  await page.reload();
};

export const openBasket = async (page: Page): Promise<void> => {
  await Locators.cartButtonWithCount(page, 1).waitFor();
  await page.goto(buildPath('/cart'));
};

export const startCheckout = async (page: Page): Promise<void> => {
  await Locators.proceedToCheckoutLink(page).click();
};

export const requestOtp = async (page: Page, email: string): Promise<void> => {
  await Locators.checkoutEmailInput(page).fill(email);
  await Locators.secureLinkButton(page).click();
};

export const createAccount = async (page: Page, shopper: FirstTimeShopper): Promise<void> => {
  await Locators.accountButton(page).click();
  await Locators.createAccountOption(page).click();
  await Locators.firstNameRegistrationInput(page).fill(shopper.firstName);
  await Locators.lastNameRegistrationInput(page).fill(shopper.lastName);
  await Locators.registrationEmailInput(page).fill(shopper.email);
  await Locators.passwordInput(page).fill(shopper.password);
  await Promise.all([
    page.waitForURL(buildPath('/account')),
    Locators.createAccountButton(page).click(),
  ]);
};

export const provideShipping = async (page: Page, address: ShippingAddress): Promise<void> => {
  await Locators.firstNameShippingInput(page).fill(address.firstName);
  await Locators.lastNameShippingInput(page).fill(address.lastName);
  await Locators.phoneInput(page).fill(address.phone);
  await Locators.addressInput(page).fill(address.address);
  await Locators.cityInput(page).fill(address.city);
  await Locators.stateSelect(page).selectOption(address.state);
  await Locators.zipCodeInput(page).fill(address.zipCode);
  await Locators.continueToShippingButton(page).click();
  await Locators.continueToPaymentButton(page).press('Enter');
};

export const providePayment = async (page: Page, payment: PaymentCard): Promise<void> => {
  await Locators.cardNumberInput(page).fill(payment.number);
  await Locators.nameOnCardInput(page).fill(payment.nameOnCard);
  await Locators.expirationDateInput(page).fill(payment.expirationDate);
  await Locators.securityCodeInput(page).fill(payment.securityCode);
};

export const savePaymentAndReviewOrder = async (page: Page): Promise<void> => {
  await Locators.savePaymentCheckbox(page).check();
  await Locators.reviewOrderButton(page).click();
};

export const placeOrder = async (page: Page): Promise<void> => {
  await Promise.all([
    page.waitForURL(buildPath('/checkout/confirmation/*')),
    Locators.placeOrderButton(page).click(),
  ]);
};
