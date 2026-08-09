import type { Page } from '@playwright/test';

import { buildPath } from '../../support/site';
import type { CheckoutData, JourneyProduct, StoreSelection } from './store-pickup.data';
import { pickupProductPath, unavailableProductPath } from './store-pickup.data';
import * as Locators from './store-pickup.locators';

export const visitStorefront = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/'));
};

export const selectStore = async (page: Page, store: StoreSelection): Promise<void> => {
  await Locators.storeLocatorButton(page).click();
  await Locators.storeCountrySelect(page).selectOption(store.countryCode);
  await Locators.storePostalCodeInput(page).fill(store.postalCode);
  await Locators.findStoreButton(page).click();
  await Locators.storeRadioLabel(page, store.name).click();
};

export const openPickupProduct = async (page: Page, product: JourneyProduct): Promise<void> => {
  await Locators.closeStoreLocatorButton(page).click();
  await page.goto(buildPath(pickupProductPath(product)));
};

export const openUnavailableProduct = async (page: Page, productId: string): Promise<void> => {
  await Locators.closeStoreLocatorButton(page).click();
  await page.goto(buildPath(unavailableProductPath(productId)));
};

export const addForPickupAndViewCart = async (page: Page): Promise<void> => {
  await Locators.pickupOptionLabel(page).click();
  await Locators.selectedPickupOption(page).waitFor();
  await Locators.addToCartButton(page).click();
  await Locators.cartButtonWithCount(page, 1).waitFor();
  await page.goto(buildPath('/cart'));
};

export const startGuestCheckout = async (page: Page, email: string): Promise<void> => {
  await Locators.proceedToCheckoutLink(page).click();
  await Locators.checkoutEmailInput(page).fill(email);
  await Locators.checkoutAsGuestButton(page).click();
};

const fillCard = async (page: Page, checkout: CheckoutData): Promise<void> => {
  await Locators.cardNumberInput(page).fill(checkout.cardNumber);
  await Locators.cardholderInput(page).fill(checkout.cardholder);
  await Locators.expirationDateInput(page).fill(checkout.expirationDate);
  await Locators.securityCodeInput(page).fill(checkout.securityCode);
};

const fillBillingAddress = async (page: Page, checkout: CheckoutData): Promise<void> => {
  await Locators.billingFirstNameInput(page).fill(checkout.firstName);
  await Locators.billingLastNameInput(page).fill(checkout.lastName);
  await Locators.billingPhoneInput(page).fill(checkout.phone);
  await Locators.billingAddressInput(page).fill(checkout.address);
  await Locators.billingCityInput(page).fill(checkout.city);
  await Locators.billingStateSelect(page).selectOption(checkout.state);
  await Locators.billingPostalCodeInput(page).fill(checkout.postalCode);
};

export const payAndPlaceOrder = async (page: Page, checkout: CheckoutData): Promise<void> => {
  await fillCard(page, checkout);
  await fillBillingAddress(page, checkout);
  await Locators.reviewOrderButton(page).click();
  await Locators.reviewedCard(page).waitFor();
  await Promise.all([
    page.waitForURL(buildPath('/checkout/confirmation/*')),
    Locators.placeOrderButton(page).click(),
  ]);
};
