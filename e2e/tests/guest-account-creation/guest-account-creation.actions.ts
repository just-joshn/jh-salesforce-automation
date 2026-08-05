import type { Locator, Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import type { Address, Card, Registrant } from './guest-account-creation.data';
import { cartBadgeLabel } from './guest-account-creation.data';
import * as Locators from './guest-account-creation.locators';

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
// for the basket count rather than for the confirmation dialog alone.
export const addToCart = async (page: Page, itemsInBasket: number): Promise<void> => {
  await Locators.addToCartButton(page).click();
  await Locators.addConfirmation(page).waitFor({ timeout: 40000 });
  await Locators.addConfirmationClose(page).click();
  await Locators.addConfirmation(page).waitFor({ state: 'hidden', timeout: 20000 });
  await Locators.miniCart(page, cartBadgeLabel(itemsInBasket)).waitFor({ timeout: 40000 });
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

export const shipToMultipleAddresses = async (page: Page): Promise<void> => {
  await Locators.shippingAddressForm(page).waitFor({ timeout: 60000 });
  await Locators.shipToMultipleAddresses(page).click({ timeout: 40000 });
  await Locators.multiShippingCards(page).first().waitFor({ timeout: 40000 });
};

/**
 * Send every line to one destination. The first address saved is applied to each
 * line, so entering it once is what puts the same address on both shipments —
 * which is the repeat the confirmation page later has to collapse.
 */
export const addSharedAddress = async (
  page: Page,
  productName: string,
  address: Address,
): Promise<void> => {
  const card = Locators.multiShippingCardFor(page, productName);
  await Locators.addNewAddress(card).click();
  const form = Locators.multiAddressForm(card);
  await form.waitFor({ timeout: 30000 });
  await fillAddressFields(form, address);
  await Locators.saveAddress(form).click();
  await form.waitFor({ state: 'detached', timeout: 40000 });
};

export const continueWithAddresses = async (page: Page): Promise<void> => {
  await Locators.continueWithAddresses(page).click();
};

// The step applies the default method to every shipment and then collapses, so
// reopening it is what puts the shopper back on the method choice itself.
export const openShippingMethods = async (page: Page): Promise<void> => {
  await Locators.editShippingOptions(page).waitFor({ timeout: 60000 });
  await Locators.editShippingOptions(page).click();
  await Locators.shippingOptionsForm(page).waitFor({ timeout: 40000 });
};

export const continueToPayment = async (page: Page): Promise<void> => {
  await Locators.continueToPayment(page).click();
  await Locators.cardNumber(page).waitFor({ timeout: 60000 });
};

export const enterPayment = async (page: Page, card: Card): Promise<void> => {
  await Locators.cardNumber(page).waitFor({ timeout: 60000 });
  await Locators.cardNumber(page).fill(card.number);
  await Locators.cardHolder(page).fill(card.holder);
  await Locators.cardExpiry(page).fill(card.expiry);
  await Locators.cardSecurityCode(page).fill(card.securityCode);
};

export const reviewOrder = async (page: Page): Promise<void> => {
  await Locators.reviewOrder(page).click();
  await Locators.placeOrder(page).waitFor({ timeout: 40000 });
};

/** Completes the guest purchase, which is this journey's precondition. */
export const placeOrder = async (page: Page): Promise<void> => {
  await Locators.placeOrder(page).click();
  await Locators.confirmationContainer(page).waitFor({ timeout: 120000 });
};

/**
 * Turn the finished purchase into an account. Only the password is typed: the
 * form arrives already carrying what the order says about the shopper.
 */
export const createAccount = async (page: Page, who: Registrant): Promise<void> => {
  await Locators.accountPassword(page).fill(who.password);
  await Locators.createAccountButton(page).click();
};

export const openSavedAddresses = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/account/addresses'));
  await Locators.savedAddressesPage(page).waitFor({ timeout: 60000 });
};
