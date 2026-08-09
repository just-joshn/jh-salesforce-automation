import type { Page } from '@playwright/test';

import { buildPath } from '../../support/site';
import type {
  CheckoutInput,
  ProductSelection,
  SalesforcePaymentsInput,
  ShippingAddress,
} from './salesforce-payments.data';
import * as Locators from './salesforce-payments.locators';

export const visitProduct = async (page: Page, product: ProductSelection): Promise<void> => {
  await page.goto(buildPath(`/product/${product.productId}?pid=${product.variantId}`));
};

export const addProductToBasket = async (page: Page): Promise<void> => {
  await Locators.addToCartButton(page).click();
};

export const startCheckout = async (page: Page): Promise<void> => {
  await Locators.viewCartLink(page).click();
  await Locators.proceedToCheckoutLink(page).click();
};

export const provideContact = async (page: Page, email: string): Promise<void> => {
  await Locators.emailInput(page).fill(email);
  await Locators.checkoutAsGuestButton(page).click();
};

export const provideShipping = async (
  page: Page,
  address: ShippingAddress,
): Promise<void> => {
  await Locators.firstNameInput(page).fill(address.firstName);
  await Locators.lastNameInput(page).fill(address.lastName);
  await Locators.phoneInput(page).fill(address.phone);
  await Locators.addressInput(page).fill(address.address);
  await Locators.cityInput(page).fill(address.city);
  await Locators.stateSelect(page).selectOption(address.state);
  await Locators.zipCodeInput(page).fill(address.zipCode);
  await Locators.continueToShippingButton(page).click();
};

export const reachPaymentReadyCheckout = async (
  page: Page,
  product: ProductSelection,
  checkout: CheckoutInput,
): Promise<void> => {
  await visitProduct(page, product);
  await addProductToBasket(page);
  await startCheckout(page);
  await provideContact(page, checkout.email);
  await provideShipping(page, checkout.shippingAddress);
};

export const selectSalesforcePaymentsMethod = async (page: Page): Promise<void> => {
  await Locators.salesforcePaymentsMethod(page).click();
};

export const supplySalesforcePaymentsData = async (
  page: Page,
  payment: SalesforcePaymentsInput,
): Promise<void> => {
  await Locators.cardNumberInput(page).fill(payment.cardNumber);
  await Locators.nameOnCardInput(page).fill(payment.nameOnCard);
  await Locators.expirationDateInput(page).fill(payment.expirationDate);
  await Locators.securityCodeInput(page).fill(payment.securityCode);
};

export const createCommerceOrder = async (page: Page): Promise<void> => {
  await Locators.reviewOrderButton(page).click();
  await Locators.placeOrderButton(page).click();
};

export const attachAndConfirmPayment = async (page: Page): Promise<void> => {
  await Locators.confirmationHeading(page).waitFor();
};
