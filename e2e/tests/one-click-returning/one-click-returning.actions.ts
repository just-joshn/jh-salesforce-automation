import type { Page } from '@playwright/test';

import { buildPath } from '../../support/site';
import type {
  JourneyProduct,
  PaymentCard,
  ReturningShopper,
  ShippingAddress,
} from './one-click-returning.data';
import * as Locators from './one-click-returning.locators';

export const visitProduct = async (page: Page, product: JourneyProduct): Promise<void> => {
  await page.goto(buildPath(`/product/${product.productId}?pid=${product.variantId}`));
};

export const addProductToBasket = async (page: Page): Promise<void> => {
  await Locators.addToCartButton(page).click();
};

export const openBasket = async (page: Page): Promise<void> => {
  await Locators.cartButtonWithCount(page, 1).waitFor();
  await page.goto(buildPath('/cart'));
};

export const openBasketFromAccount = async (page: Page): Promise<void> => {
  await Locators.cartButton(page).click();
};

export const startCheckout = async (page: Page): Promise<void> => {
  await Locators.proceedToCheckoutLink(page).click();
};

export const requestOtp = async (page: Page, email: string): Promise<void> => {
  await Locators.checkoutEmailInput(page).fill(email);
  await Locators.secureLinkButton(page).click();
};

export const createAccount = async (page: Page, shopper: ReturningShopper): Promise<void> => {
  await Locators.accountButton(page).click();
  await Locators.createAccountOption(page).click();
  await Locators.firstNameInput(page).fill(shopper.firstName);
  await Locators.lastNameInput(page).fill(shopper.lastName);
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
};

export const providePayment = async (page: Page, payment: PaymentCard): Promise<void> => {
  await Locators.cardNumberInput(page).fill(payment.number);
  await Locators.nameOnCardInput(page).fill(payment.nameOnCard);
  await Locators.expirationDateInput(page).fill(payment.expirationDate);
  await Locators.securityCodeInput(page).fill(payment.securityCode);
  await Locators.reviewOrderButton(page).click();
};

export const placeOrder = async (page: Page): Promise<void> => {
  await Promise.all([
    page.waitForURL(buildPath('/checkout/confirmation/*')),
    Locators.placeOrderButton(page).click(),
  ]);
};
