import type { Page } from '@playwright/test';

import { buildPath } from '../../support/site';
import type {
  JourneyProduct,
  PaymentCard,
  ShippingAddress,
} from './multi-shipment.data';
import * as Locators from './multi-shipment.locators';

export const visitProduct = async (page: Page, product: JourneyProduct): Promise<void> => {
  await page.goto(buildPath(`/product/${product.productId}?pid=${product.variantId}`));
};

export const addFirstProduct = async (page: Page, product: JourneyProduct): Promise<void> => {
  await visitProduct(page, product);
  await Locators.addToCartButton(page).click();
  await Locators.closeAddedToCartButton(page).click();
};

export const addSecondProductAndOpenCart = async (
  page: Page,
  product: JourneyProduct,
): Promise<void> => {
  await visitProduct(page, product);
  await Locators.addToCartButton(page).click();
  await page.goto(buildPath('/cart'));
};

export const startMultiShipmentCheckout = async (page: Page, email: string): Promise<void> => {
  await Locators.proceedToCheckoutLink(page).click();
  await Locators.emailInput(page).fill(email);
  await Locators.checkoutAsGuestButton(page).click();
  await Locators.startMultiShipmentButton(page).click();
};

const fillAddress = async (page: Page, address: ShippingAddress): Promise<void> => {
  await Locators.firstNameInput(page).fill(address.firstName);
  await Locators.lastNameInput(page).fill(address.lastName);
  await Locators.phoneInput(page).fill(address.phone);
  await Locators.addressInput(page).fill(address.address);
  await Locators.cityInput(page).fill(address.city);
  await Locators.stateSelect(page).selectOption(address.state);
  await Locators.zipCodeInput(page).fill(address.zipCode);
};

export const addDestination = async (
  page: Page,
  productName: string,
  address: ShippingAddress,
): Promise<void> => {
  await Locators.addNewAddressButton(page, productName).click();
  await fillAddress(page, address);
  await Locators.saveAddressButton(page).press('Enter');
};

export const continueToShipping = async (page: Page): Promise<void> => {
  await Locators.continueToShippingButton(page).click();
};

export const selectShippingMethods = async (
  page: Page,
  methodNames: readonly [string, string],
): Promise<void> => {
  await Locators.editShippingOptionsButton(page).click();
  await Locators.shippingMethodRadio(page, methodNames[0], 0).press('Space');
  await Locators.shippingMethodRadio(page, methodNames[1], 1).press('Space');
  await Locators.continueToPaymentButton(page).press('Enter');
};

export const openShippingOptions = async (page: Page): Promise<void> => {
  await Locators.editShippingOptionsButton(page).click();
  await Locators.continueToPaymentButton(page).waitFor();
};

export const selectFirstShipmentMethod = async (
  page: Page,
  methodName: string,
): Promise<void> => {
  await Locators.shippingMethodRadio(page, methodName, 0).press('Space');
  await Locators.continueToPaymentButton(page).press('Enter');
};

export const changeDestination = async (
  page: Page,
  productName: string,
  addressOption: string,
): Promise<void> => {
  await Locators.editShippingAddressesButton(page).click();
  await Locators.deliveryAddressSelect(page, productName).selectOption({ label: addressOption });
  await Locators.continueToShippingButton(page).click();
  await Locators.editShippingAddressButton(page).waitFor();
};

export const restoreMultiShipmentDestination = async (
  page: Page,
  productName: string,
  address: ShippingAddress,
): Promise<void> => {
  await Locators.editShippingAddressButton(page).click();
  await Locators.startMultiShipmentButton(page).click();
  await addDestination(page, productName, address);
  await Locators.continueToShippingButton(page).click();
};

const fillPaymentCard = async (page: Page, payment: PaymentCard): Promise<void> => {
  await Locators.cardNumberInput(page).fill(payment.number);
  await Locators.nameOnCardInput(page).fill(payment.nameOnCard);
  await Locators.expirationDateInput(page).fill(payment.expirationDate);
  await Locators.securityCodeInput(page).fill(payment.securityCode);
};

export const payAndPlaceOrder = async (page: Page, payment: PaymentCard): Promise<void> => {
  await fillPaymentCard(page, payment);
  await Locators.reviewOrderButton(page).click();
  await Promise.all([
    page.waitForURL(buildPath('/checkout/confirmation/*')),
    Locators.placeOrderButton(page).click(),
  ]);
};
