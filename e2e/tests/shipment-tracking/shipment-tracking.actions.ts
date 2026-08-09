import type { Page } from '@playwright/test';

import { buildPath } from '../../support/site';
import type {
  CheckoutInput,
  PaymentCard,
  ShippingAddress,
  TrackingNavigation,
} from './shipment-tracking.data';
import * as Locators from './shipment-tracking.locators';

export const visitProduct = async (page: Page, productId: string): Promise<void> => {
  await page.goto(buildPath(`/product/${productId}`));
};

export const addProductToBasket = async (page: Page): Promise<void> => {
  await Locators.cartButtonWithCount(page, 0).waitFor();
  if (await Locators.declineTrackingButton(page).isVisible()) {
    await Locators.declineTrackingButton(page).click();
    await Locators.declineTrackingButton(page).waitFor({ state: 'hidden' });
  }
  await Locators.addToCartButton(page).click();
};

export const reviewBasketAndStartCheckout = async (page: Page): Promise<void> => {
  await Locators.cartButtonWithCount(page, 1).waitFor();
  await page.goto(buildPath('/cart'));
  await Locators.proceedToCheckoutLink(page).click();
};

export const provideContact = async (page: Page, email: string): Promise<void> => {
  await Locators.emailInput(page).fill(email);
  await Locators.checkoutAsGuestButton(page).click();
};

export const provideShipping = async (page: Page, address: ShippingAddress): Promise<void> => {
  await Locators.firstNameInput(page).fill(address.firstName);
  await Locators.lastNameInput(page).fill(address.lastName);
  await Locators.phoneInput(page).fill(address.phone);
  await Locators.addressInput(page).fill(address.address);
  await Locators.cityInput(page).fill(address.city);
  await Locators.stateSelect(page).selectOption(address.state);
  await Locators.zipCodeInput(page).fill(address.zipCode);
  await Locators.continueToShippingButton(page).click();
};

export const providePaymentAndPlaceOrder = async (
  page: Page,
  payment: PaymentCard,
): Promise<void> => {
  await Locators.cardNumberInput(page).fill(payment.number);
  await Locators.nameOnCardInput(page).fill(payment.nameOnCard);
  await Locators.expirationDateInput(page).fill(payment.expirationDate);
  await Locators.securityCodeInput(page).fill(payment.securityCode);
  await Locators.reviewOrderButton(page).click();
  await Promise.all([
    page.waitForURL(buildPath('/checkout/confirmation/*')),
    Locators.placeOrderButton(page).click(),
  ]);
};

export const completeGuestCheckout = async (
  page: Page,
  productId: string,
  checkout: CheckoutInput,
): Promise<void> => {
  await visitProduct(page, productId);
  await addProductToBasket(page);
  await reviewBasketAndStartCheckout(page);
  await provideContact(page, checkout.email);
  await provideShipping(page, checkout.shippingAddress);
  await providePaymentAndPlaceOrder(page, checkout.payment);
};

export const shopperAccessToken = async (page: Page, keyPrefix: string): Promise<string> => {
  const accessToken = await page.evaluate((prefix): string | null => {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) {
        return localStorage.getItem(key);
      }
    }
    return null;
  }, keyPrefix);
  if (!accessToken) {
    throw new Error(`Storefront local storage contains no key beginning ${keyPrefix}`);
  }
  return accessToken;
};

export const createPostCheckoutAccount = async (
  page: Page,
  email: string,
  password: string,
): Promise<void> => {
  await Locators.postCheckoutEmailInput(page).fill(email);
  await Locators.postCheckoutPasswordInput(page).fill(password);
  await Promise.all([
    page.waitForURL(buildPath('/account')),
    Locators.createAccountButton(page).click(),
  ]);
};

export const openOrderHistory = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/account/orders'));
};

export const openOrderDetail = async (page: Page, orderNo: string): Promise<void> => {
  await page.goto(buildPath(`/account/orders/${encodeURIComponent(orderNo)}`));
};

export const openCarrierTracking = async (
  page: Page,
  navigation: TrackingNavigation,
): Promise<Page> => {
  if (navigation.kind === 'multiple') {
    await Locators.trackShipmentButton(page).click();
  }

  const popup = page.waitForEvent('popup');
  const link =
    navigation.kind === 'single'
      ? Locators.trackShipmentLink(page)
      : Locators.trackingOption(page, navigation.accessibleName);
  await link.click();
  return popup;
};
