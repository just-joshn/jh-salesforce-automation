import type { Locator, Page } from '@playwright/test';
import type { ShopperCredentials } from '../../support/oms';
import { buildPath } from '../../support/site';
import * as Locators from './track-shipment.locators';

const pageTimeout = 60000;

export const signIn = async (page: Page, credentials: ShopperCredentials): Promise<void> => {
  await page.goto(buildPath('/login'));
  await Locators.signinEmail(page).fill(credentials.email);
  await Locators.usePasswordMethod(page).click();
  await Locators.signinPassword(page).fill(credentials.password);
  await Locators.signInButton(page).click();
  await page.waitForURL(/\/account/, { timeout: pageTimeout });
};

export const openOrderHistory = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/account/orders'));
  await Locators.orderHistoryPage(page).waitFor({ timeout: pageTimeout });
};

export const openOrder = async (page: Page, orderNumberText: string): Promise<void> => {
  await Locators.viewDetails(Locators.orderCard(page, orderNumberText)).click();
  await Locators.orderDetailPage(page).waitFor({ timeout: pageTimeout });
};

/** Several trackable shipments are offered behind the Track Shipment control. */
export const openTrackingOptions = async (page: Page): Promise<void> => {
  await Locators.trackShipment(page).click();
  await Locators.trackingOptions(page).waitFor({ timeout: pageTimeout });
};

/**
 * The storefront hands off to the carrier in a new tab. The tab is returned
 * rather than settled, so the journey can assert which carrier page was opened
 * without depending on the carrier answering.
 */
const continueToCarrier = async (page: Page, link: Locator): Promise<Page> => {
  const [carrier] = await Promise.all([page.context().waitForEvent('page'), link.click()]);
  return carrier;
};

/** The single-shipment path: the Track Shipment control is itself the carrier link. */
export const followTracking = (page: Page): Promise<Page> =>
  continueToCarrier(page, Locators.trackShipment(page));

/** The multi-shipment path: one named option per trackable shipment. */
export const followTrackingOption = (page: Page, label: string): Promise<Page> =>
  continueToCarrier(page, Locators.trackingOption(page, label));
