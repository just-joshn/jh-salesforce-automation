import type { Locator, Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import type {
  Address,
  Card,
  PickupStore,
  SelectableVariant,
  ShopperCredentials,
} from './purchase-fulfillment.data';
import { cartBadgeLabel, orderNumberFrom, pickupOptionLabel } from './purchase-fulfillment.data';
import * as Locators from './purchase-fulfillment.locators';

export const openProduct = async (page: Page, masterId: string): Promise<void> => {
  await page.goto(buildPath(`/product/${masterId}`));
  await Locators.productDetail(page).waitFor({ timeout: 40000 });
};

// A colour change rebuilds the size options, so these clicks get longer than the
// default timeout.
export const chooseVariant = async (page: Page, variant: SelectableVariant): Promise<void> => {
  await Locators.colorOption(page, variant.colorName).click({ timeout: 30000 });
  if (variant.sizeName !== undefined) {
    await Locators.sizeOption(page, variant.sizeName).click({ timeout: 30000 });
  }
};

export const selectPickupStore = async (page: Page, store: PickupStore): Promise<void> => {
  await Locators.selectStoreButton(page).click();
  await Locators.storeModal(page).waitFor({ timeout: 30000 });
  await Locators.storeCountry(page).selectOption({ label: store.countryLabel });
  await Locators.storePostalCode(page).fill(store.postalCode);
  await Locators.storeFind(page).click();
  await Locators.storeChoice(page, store.id).click({ timeout: 40000 });
  await Locators.storeModalClose(page).click();
  await Locators.storeModal(page).waitFor({ state: 'hidden', timeout: 20000 });
};

// The choice only becomes clickable once the page knows the store's shelf.
export const choosePickup = async (page: Page): Promise<void> => {
  await Locators.pickupOption(page, pickupOptionLabel).click({ timeout: 30000 });
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

export const signIn = async (page: Page, credentials: ShopperCredentials): Promise<void> => {
  await page.goto(buildPath('/login'));
  await Locators.signinEmail(page).fill(credentials.email);
  await Locators.usePasswordMethod(page).click();
  await Locators.signinPassword(page).fill(credentials.password);
  await Locators.signInButton(page).click();
  await page.waitForURL(/\/account/, { timeout: 60000 });
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

export const enterShippingAddress = async (page: Page, address: Address): Promise<void> => {
  const form = Locators.shippingAddressForm(page);
  await form.waitFor({ timeout: 60000 });
  await fillAddressFields(form, address);
  await Locators.continueToShippingMethod(page).click();
};

export const continueWithSavedAddress = async (page: Page): Promise<void> => {
  await Locators.continueToShippingMethod(page).click();
};

export const shipToMultipleAddresses = async (page: Page): Promise<void> => {
  await Locators.shipToMultipleAddresses(page).click({ timeout: 40000 });
  await Locators.multiShippingCards(page).first().waitFor({ timeout: 40000 });
};

// The first address saved is applied to every line; later ones land on the line
// whose card they were entered from.
export const addAddressForProduct = async (
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

export const continueWithMultipleAddresses = async (page: Page): Promise<void> => {
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

// A pickup-only order has no shipping address to copy, so billing is typed in.
export const enterBillingAddress = async (page: Page, address: Address): Promise<void> => {
  const form = Locators.billingAddressForm(page);
  await form.waitFor({ timeout: 30000 });
  await fillAddressFields(form, address);
};

export const reviewOrder = async (page: Page): Promise<void> => {
  await Locators.reviewOrder(page).click();
  await Locators.placeOrder(page).waitFor({ timeout: 40000 });
};

export const placeOrder = async (page: Page): Promise<void> => {
  await Locators.placeOrder(page).click();
  await Locators.confirmationContainer(page).waitFor({ timeout: 90000 });
};

export const readOrderNumber = async (page: Page): Promise<string> =>
  orderNumberFrom(await Locators.orderNumberLine(page).innerText());

export const openOrderHistory = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/account/orders'));
  await Locators.orderHistoryPage(page).waitFor({ timeout: 60000 });
};
