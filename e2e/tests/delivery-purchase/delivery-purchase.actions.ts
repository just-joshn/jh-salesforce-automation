import type { Page } from '@playwright/test';

import { buildPath } from '../../support/site';
import type { CheckoutInput, PaymentCard, ShippingAddress } from './delivery-purchase.data';
import * as Locators from './delivery-purchase.locators';

export const visitProduct = async (page: Page, productId: string): Promise<void> => {
  await page.goto(buildPath(`/product/${productId}`));
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
};

export const reviewBasketAndStartCheckout = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/cart'));
  await Locators.proceedToCheckoutLink(page).click();
};

export const provideContact = async (page: Page, email: string): Promise<void> => {
  await Locators.emailInput(page).fill(email);
  await Locators.checkoutAsGuestButton(page).click();
};

export const fillShippingAddress = async (page: Page, address: ShippingAddress): Promise<void> => {
  await Locators.firstNameInput(page).fill(address.firstName);
  await Locators.lastNameInput(page).fill(address.lastName);
  await Locators.phoneInput(page).fill(address.phone);
  await Locators.addressInput(page).fill(address.address);
  await Locators.cityInput(page).fill(address.city);
  await Locators.stateSelect(page).selectOption(address.state);
  await Locators.zipCodeInput(page).fill(address.zipCode);
};

export const provideShipping = async (page: Page, address: ShippingAddress): Promise<void> => {
  await fillShippingAddress(page, address);
  await Locators.continueToShippingButton(page).click();
};

export const submitEmptyShippingAddress = async (page: Page): Promise<void> => {
  await Locators.continueToShippingButton(page).click();
};

export const fillPaymentCard = async (page: Page, payment: PaymentCard): Promise<void> => {
  await Locators.cardNumberInput(page).fill(payment.number);
  await Locators.nameOnCardInput(page).fill(payment.nameOnCard);
  await Locators.expirationDateInput(page).fill(payment.expirationDate);
  await Locators.securityCodeInput(page).fill(payment.securityCode);
};

export const reviewPayment = async (page: Page, payment: PaymentCard): Promise<void> => {
  await fillPaymentCard(page, payment);
  await Locators.reviewOrderButton(page).click();
};

export const providePaymentAndPlaceOrder = async (
  page: Page,
  payment: PaymentCard,
): Promise<void> => {
  await reviewPayment(page, payment);
  await Promise.all([
    page.waitForURL(buildPath('/checkout/confirmation/*')),
    Locators.placeOrderButton(page).click(),
  ]);
};

export const reachPayment = async (
  page: Page,
  productId: string,
  checkout: CheckoutInput,
): Promise<void> => {
  await visitProduct(page, productId);
  await addProductToBasket(page);
  await reviewBasketAndStartCheckout(page);
  await provideContact(page, checkout.email);
  await provideShipping(page, checkout.shippingAddress);
};
