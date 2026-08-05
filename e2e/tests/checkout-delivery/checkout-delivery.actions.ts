import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import type { Address, Card } from './checkout-delivery.data';
import * as Locators from './checkout-delivery.locators';

export const openProduct = async (page: Page, productId: string): Promise<void> => {
  await page.goto(buildPath(`/product/${productId}`));
};

// Color change rebuilds sizes — wait longer for the click.
export const selectVariation = async (page: Page, attribute: string): Promise<void> => {
  await Locators.variationOption(page, attribute).first().click({ timeout: 30000 });
};

// Click the in-stock size we already looked up.
export const selectSize = async (page: Page, size: string): Promise<void> => {
  await Locators.sizeOption(page, size).click({ timeout: 30000 });
};

export const addToCart = async (page: Page): Promise<void> => {
  await Locators.addToCartButton(page).first().click();
  await Locators.addConfirmation(page).first().waitFor({ timeout: 15000 });
};

export const openCheckout = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/checkout'));
  await Locators.checkoutContainer(page).waitFor({ timeout: 20000 });
};

export const fillContact = async (page: Page, email: string): Promise<void> => {
  await Locators.emailInput(page).fill(email);
  await Locators.checkoutAsGuest(page).click();
};

export const fillShippingAddress = async (page: Page, address: Address): Promise<void> => {
  await Locators.shipFirstName(page).fill(address.firstName);
  await Locators.shipLastName(page).fill(address.lastName);
  await Locators.shipPhone(page).fill(address.phone);
  await Locators.shipCountry(page).selectOption(address.countryCode);
  await Locators.shipAddress1(page).fill(address.address1);
  await Locators.shipCity(page).fill(address.city);
  await Locators.shipState(page).selectOption(address.stateCode);
  await Locators.shipPostal(page).fill(address.postalCode);
  await Locators.continueToShipping(page).click();
  // Continue picks default shipping and goes to pay.
};

// Pickup already has store/method — may skip shipping. Fill address only if shown.
export const fillShippingAddressIfPresent = async (page: Page, address: Address): Promise<void> => {
  // Whichever step renders next wins the race: the address form or payment.
  const addressForm = Locators.shipFirstName(page);
  await addressForm.or(Locators.cardNumber(page)).first().waitFor({ timeout: 30000 });
  if (await addressForm.isVisible()) {
    await fillShippingAddress(page, address);
  }
};

export const fillPayment = async (page: Page, card: Card): Promise<void> => {
  await Locators.cardNumber(page).fill(card.number);
  await Locators.cardHolder(page).fill(card.holder);
  await Locators.cardExpiry(page).fill(card.expiry);
  await Locators.cardSecurityCode(page).fill(card.securityCode);
  await Locators.reviewOrderButton(page).first().click();
};

export const placeOrder = async (page: Page): Promise<void> => {
  await Locators.placeOrderButton(page).first().click();
};
