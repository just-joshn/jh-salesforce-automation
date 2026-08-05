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

export const detailSection = (page: Page, title: string): Locator =>
  orderDetailPage(page).getByRole('heading', { name: title, exact: true });

// The line's own product, as the link back to it. Matching the name as text would
// also catch the price live-region, which repeats the name without spacing.
export const productLink = (page: Page, productName: string): Locator =>
  orderDetailPage(page).getByRole('link', { name: productName, exact: true });

/** The block the page only renders for an order Order Management has ingested. */
export const orderActions = (page: Page, heading: string): Locator =>
  orderDetailPage(page).getByText(heading, { exact: true });

export const trackShipment = (page: Page): Locator =>
  page.getByTestId('account-order-detail-track-shipment');

export const startReturn = (page: Page): Locator =>
  page.getByTestId('account-order-detail-start-return');

export const namedButton = (page: Page, label: string): Locator =>
  orderDetailPage(page).getByRole('button', { name: label, exact: true });

/** The ECOM shipment card the page falls back to when no OMS shipment exists. */
export const trackingSection = (page: Page): Locator =>
  page.getByTestId('account-order-detail-tracking');

export const trackingCard = (page: Page): Locator => page.getByTestId('order-tracking-card');

export const trackingText = (page: Page, text: string | RegExp): Locator =>
  trackingCard(page).getByText(text);

/** Any link out of the order, which an un-ingested order has no carrier one among. */
export const carrierLinks = (page: Page): Locator =>
  orderDetailPage(page).locator('a[target="_blank"]');
