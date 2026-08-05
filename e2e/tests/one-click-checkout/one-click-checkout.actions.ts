import type { Page } from '@playwright/test';
import { buildPath } from '../../support/site';
import type { Card, SavedDataShopper } from './one-click-checkout.data';
import { cartBadgeLabel, savePaymentLabel } from './one-click-checkout.data';
import * as Locators from './one-click-checkout.locators';

/**
 * Authenticate the returning shopper. The journey's identity step is a verified
 * SLAS session; a shopper who already has one does not re-verify a token, which
 * is what makes this the returning-shopper path through the one-click page.
 */
export const signIn = async (page: Page, shopper: SavedDataShopper): Promise<void> => {
  await page.goto(buildPath('/login'));
  await Locators.signinEmail(page).fill(shopper.email);
  await Locators.usePasswordMethod(page).click();
  await Locators.signinPassword(page).fill(shopper.password);
  await Locators.signInButton(page).click();
  await page.waitForURL(/\/account/, { timeout: 60000 });
};

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

/** Start of the journey: checkout reached with a valid basket. */
export const openCheckout = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/checkout'));
  await Locators.oneClickContainer(page).waitFor({ timeout: 60000 });
  await Locators.checkoutSkeleton(page).waitFor({ state: 'hidden', timeout: 60000 });
};

/**
 * Apply the retrieved address to the basket. The page opens on the account's
 * preferred entry already chosen, so continuing is what commits it to the
 * basket's shipment.
 */
export const applySavedAddress = async (page: Page): Promise<void> => {
  await Locators.continueToShippingAddress(page).click({ timeout: 40000 });
  await Locators.continueToShippingMethod(page).click({ timeout: 60000 });
};

export const applyShippingMethod = async (page: Page): Promise<void> => {
  await Locators.shippingOptionsForm(page).waitFor({ timeout: 60000 });
  await Locators.continueToPayment(page).click();
};

/**
 * Enter a card and ask the shop to keep it. This is the journey's optional
 * save-a-new-payment-instrument branch, which is the branch that proves newly
 * saved checkout data can carry an order.
 */
export const enterAndSaveNewPayment = async (page: Page, card: Card): Promise<void> => {
  await Locators.cardNumber(page).waitFor({ timeout: 60000 });
  await Locators.cardNumber(page).fill(card.number);
  await Locators.cardHolder(page).fill(card.holder);
  await Locators.cardExpiry(page).fill(card.expiry);
  await Locators.cardSecurityCode(page).fill(card.securityCode);
  await Locators.savePaymentMethod(page, savePaymentLabel).check();
};

export const placeOrder = async (page: Page): Promise<void> => {
  await Locators.placeOrder(page).click();
  await Locators.confirmationContainer(page).waitFor({ timeout: 90000 });
};
