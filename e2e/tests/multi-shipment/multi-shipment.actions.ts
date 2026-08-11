import type { Page } from '@playwright/test';

import { buildPath } from '../../support/site';
import type { JourneyProduct, PaymentCard, ShippingAddress } from './multi-shipment.data';
import * as Locators from './multi-shipment.locators';

export const visitProduct = async (page: Page, product: JourneyProduct): Promise<void> => {
  await page.goto(buildPath(`/product/${product.productId}?pid=${product.variantId}`));
};

const dismissOptionalTracking = async (page: Page): Promise<void> => {
  await Locators.declineTrackingButton(page)
    .click({ timeout: 2_000 })
    .catch(() => undefined);
};

const waitForBasketState = async (page: Page, itemCount: number): Promise<void> => {
  await Locators.cartCountButton(page, itemCount).waitFor();
  await dismissOptionalTracking(page);
};

const addProductAtCount = async (
  page: Page,
  product: JourneyProduct,
  itemCount: number,
): Promise<void> => {
  await visitProduct(page, product);
  await waitForBasketState(page, itemCount);
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
  await waitForBasketState(page, itemCount + 1);
};

export const addFirstProduct = async (page: Page, product: JourneyProduct): Promise<void> => {
  await addProductAtCount(page, product, 0);
};

export const addSecondProduct = async (page: Page, product: JourneyProduct): Promise<void> => {
  await addProductAtCount(page, product, 1);
};

export const openCart = async (page: Page): Promise<void> => {
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
  const secondMethodIndex = methodNames[0] === methodNames[1] ? 1 : 0;
  await Locators.shippingSummaryMethod(page, methodNames[0]).first().waitFor();
  await Locators.shippingSummaryMethod(page, methodNames[1]).nth(secondMethodIndex).waitFor();
  await Locators.cardNumberInput(page).waitFor();
};

export const openShippingOptions = async (page: Page): Promise<void> => {
  await Locators.cardNumberInput(page).waitFor();
  await Locators.editShippingOptionsButton(page).click();
  await Locators.continueToPaymentButton(page).waitFor();
};

export const selectFirstShipmentMethod = async (page: Page, methodName: string): Promise<void> => {
  await Locators.shippingMethodRadio(page, methodName, 0).press('Space');
  await Locators.continueToPaymentButton(page).press('Enter');
};

export const changeDestination = async (
  page: Page,
  productName: string,
  addressOption: string,
): Promise<void> => {
  await Locators.editShippingAddressesButton(page).click();
  await Locators.returnToSingleShipmentButton(page).waitFor();
  await Locators.deliveryAddressOption(page, productName, addressOption).waitFor({
    state: 'attached',
  });
  await Locators.deliveryAddressSelect(page, productName).selectOption({ label: addressOption });
  await Locators.selectedDeliveryAddress(page, productName, addressOption).waitFor({
    state: 'attached',
  });
  await Locators.continueToShippingButton(page).press('Enter');
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
