import type { Locator, Page } from '@playwright/test';

// Login form only. Step 1: email. Step 2: password.
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

export const orderHistoryHeading = (page: Page, title: string): Locator =>
  orderHistoryPage(page).getByRole('heading', { name: title, level: 1 });

// History entries carry no test id or role of their own, so an order's entry is
// found as the history page's own list item that names that order number.
const orderCards = (page: Page): Locator => orderHistoryPage(page).locator('> div > div');

export const orderCard = (page: Page, orderNumberText: string): Locator =>
  orderCards(page).filter({ hasText: orderNumberText });

export const viewDetails = (card: Locator): Locator =>
  card.getByRole('link', { name: /view details/i });

export const cardText = (card: Locator, text: string | RegExp): Locator => card.getByText(text);

// The image only appears once the line has been hydrated from Shopper Products.
// Its alt text opens with the product's own name.
export const productImage = (scope: Locator, productName: string): Locator =>
  scope.getByRole('img', { name: productName });

export const orderDetailPage = (page: Page): Locator =>
  page.getByTestId('account-order-details-page');

export const orderDetailHeading = (page: Page, title: string): Locator =>
  orderDetailPage(page).getByRole('heading', { name: title, level: 1 });

export const detailSection = (page: Page, title: string): Locator =>
  orderDetailPage(page).getByRole('heading', { name: title, exact: true });

export const detailText = (page: Page, text: string | RegExp): Locator =>
  orderDetailPage(page).getByText(text);

export const orderSummary = (page: Page): Locator => page.getByTestId('sf-order-summary');

export const trackingCard = (page: Page): Locator => page.getByTestId('order-tracking-card');

export const trackingText = (page: Page, text: string | RegExp): Locator =>
  trackingCard(page).getByText(text);

export const backToOrderHistory = (page: Page): Locator =>
  orderDetailPage(page).getByRole('link', { name: /back to order history/i });
