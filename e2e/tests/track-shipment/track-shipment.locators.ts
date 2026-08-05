import type { Locator, Page } from '@playwright/test';

const authForm = (page: Page): Locator => page.getByTestId('sf-auth-modal-form');

export const signinEmail = (page: Page): Locator => authForm(page).getByLabel('Email');

export const usePasswordMethod = (page: Page): Locator =>
  authForm(page).getByRole('button', { name: 'Password', exact: true });

export const signinPassword = (page: Page): Locator =>
  authForm(page).getByLabel('Password', { exact: true });

export const signInButton = (page: Page): Locator =>
  authForm(page).getByRole('button', { name: 'Sign In', exact: true });

export const orderHistoryPage = (page: Page): Locator =>
  page.getByTestId('account-order-history-page');

const orderCards = (page: Page): Locator => orderHistoryPage(page).locator('> div > div');

export const orderCard = (page: Page, orderNumberText: string): Locator =>
  orderCards(page).filter({ hasText: orderNumberText });

export const viewDetails = (card: Locator): Locator =>
  card.getByRole('link', { name: /view details/i });

export const orderDetailPage = (page: Page): Locator =>
  page.getByTestId('account-order-details-page');

export const orderDetailHeading = (page: Page, title: string): Locator =>
  orderDetailPage(page).getByRole('heading', { name: title, level: 1 });

export const detailText = (page: Page, text: string | RegExp): Locator =>
  orderDetailPage(page).getByText(text);

/** The block the page only renders for an order Order Management has ingested. */
export const orderActions = (page: Page, heading: string): Locator =>
  orderDetailPage(page).getByText(heading, { exact: true });

export const trackShipment = (page: Page): Locator =>
  page.getByTestId('account-order-detail-track-shipment');

/** Present only when more than one shipment is trackable. */
export const trackingOptions = (page: Page): Locator => page.getByTestId('track-shipment-options');

export const trackingOption = (page: Page, label: string): Locator =>
  trackingOptions(page).getByRole('link', { name: label, exact: true });

export const trackingOptionLinks = (page: Page): Locator => trackingOptions(page).getByRole('link');

/** Any link on the order that points at an exact URL, for proving one is absent. */
export const linkWithHref = (page: Page, href: string): Locator =>
  orderDetailPage(page).locator(`a[href=${JSON.stringify(href)}]`);
