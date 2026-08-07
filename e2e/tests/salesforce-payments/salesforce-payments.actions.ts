import type { Locator, Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import type { Address } from './salesforce-payments.data';
import { cartBadgeLabel } from './salesforce-payments.data';
import * as Locators from './salesforce-payments.locators';

export const openProduct = async (page: Page, masterId: string): Promise<void> => {
  await page.goto(buildPath(`/product/${masterId}`));
  await Locators.productDetail(page).waitFor({ timeout: 40000 });
};

// A colour change rebuilds the size options, so these clicks get longer than the
// default timeout.
export const chooseVariant = async (
  page: Page,
  variant: { colorName: string; sizeName: string },
): Promise<void> => {
  await Locators.colorOption(page, variant.colorName).click({ timeout: 30000 });
  await Locators.sizeOption(page, variant.sizeName).click({ timeout: 30000 });
};

// Leaving the page before the shop has stored the line loses it, so this waits
// for the basket count instead of the confirmation dialog alone.
export const addToCart = async (page: Page, itemsInBasket: number): Promise<void> => {
  await Locators.addToCartButton(page).click();
  await Locators.addConfirmation(page).waitFor({ timeout: 40000 });
  await Locators.addConfirmationClose(page).click();
  await Locators.addConfirmation(page).waitFor({ state: 'hidden', timeout: 20000 });
  await Locators.miniCart(page, cartBadgeLabel(itemsInBasket)).waitFor({ timeout: 40000 });
};

export const openMiniCart = async (page: Page): Promise<void> => {
  await Locators.openMiniCart(page).click();
};

export const openCart = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/cart'));
  await Locators.cartContainer(page).waitFor({ timeout: 40000 });
};

export const proceedToCheckout = async (page: Page): Promise<void> => {
  await Locators.proceedToCheckout(page).click();
  await Locators.checkoutContainer(page).waitFor({ timeout: 40000 });
};

export const submitGuestContact = async (page: Page, email: string): Promise<void> => {
  await Locators.emailInput(page).fill(email);
  await Locators.checkoutAsGuest(page).click();
  await Locators.editContactInfo(page).waitFor({ timeout: 60000 });
};

const fillAddressFields = async (scope: Locator, address: Address): Promise<void> => {
  await Locators.firstNameField(scope).fill(address.firstName);
  await Locators.lastNameField(scope).fill(address.lastName);
  await Locators.phoneField(scope).fill(address.phone);
  await Locators.countryField(scope).selectOption(address.countryCode);
  await Locators.addressLineField(scope).fill(address.address1);
  await Locators.cityField(scope).fill(address.city);
  await Locators.stateField(scope).selectOption(address.stateCode);
  await Locators.postalCodeField(scope).fill(address.postalCode);
};

/** Prepare the basket: the destination the payment amount is calculated from. */
export const enterShippingAddress = async (page: Page, address: Address): Promise<void> => {
  const form = Locators.shippingAddressForm(page);
  await form.waitFor({ timeout: 60000 });
  await fillAddressFields(form, address);
  await Locators.continueToShippingMethod(page).click();
};

// The step applies the default method and then collapses, so reopening it is what
// puts the shopper back on the method choice itself.
export const openShippingMethods = async (page: Page): Promise<void> => {
  await Locators.editShippingOptions(page).waitFor({ timeout: 60000 });
  await Locators.editShippingOptions(page).click();
  await Locators.shippingOptionsForm(page).waitFor({ timeout: 40000 });
};

export const continueToPayment = async (page: Page): Promise<void> => {
  await Locators.continueToPayment(page).click();
  await Locators.paymentStep(page).waitFor({ timeout: 60000 });
};

/**
 * Invoke the express method the storefront was configured to offer here. The
 * button itself is drawn by the payment SDK inside the storefront's wrapper, so
 * the wrapper is what is clicked into.
 */
export const invokeExpressMethod = async (page: Page): Promise<void> => {
  const placement = Locators.expressPlacement(page).first();
  await placement.waitFor({ timeout: 60000 });
  await placement.getByRole('button').first().click({ timeout: 40000 });
};

export const reviewOrder = async (page: Page): Promise<void> => {
  await Locators.reviewOrder(page).click();
  await Locators.placeOrder(page).waitFor({ timeout: 40000 });
};

/**
 * Confirm the payment and create the order. The storefront's own place-order
 * control is what asks the sheet to confirm, so this drives the app. It never
 * drives the provider.
 */
export const confirmPaymentAndPlaceOrder = async (page: Page): Promise<void> => {
  await Locators.placeOrder(page).click();
};

/**
 * Wait out whichever ending the provider chose. A provider that finishes the
 * payment itself sends the shopper through its processing route first. Both
 * endings may win the race, so only the confirmation is required.
 */
export const awaitOrderConfirmation = async (page: Page): Promise<void> => {
  await Locators.confirmationContainer(page).waitFor({ timeout: 180000 });
};
