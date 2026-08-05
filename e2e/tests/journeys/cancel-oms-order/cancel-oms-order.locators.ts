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

export const cancelOrder = (page: Page, label: string): Locator =>
  orderDetailPage(page).getByRole('button', { name: label, exact: true });

/** The cancellation modal carries no test id, so it is found by its dialog role. */
const cancelDialog = (page: Page): Locator => page.getByRole('dialog');

export const cancelHeading = (page: Page, heading: string): Locator =>
  cancelDialog(page).getByText(heading);

export const cancelDialogText = (page: Page, text: string): Locator =>
  cancelDialog(page).getByText(text);

export const cancelReason = (page: Page, label: string): Locator =>
  cancelDialog(page).getByLabel(label);

export const confirmCancellation = (page: Page, label: string): Locator =>
  cancelDialog(page).getByRole('button', { name: label, exact: true });

export const keepOrder = (page: Page, label: string): Locator =>
  cancelDialog(page).getByRole('button', { name: label, exact: true });

/** The page's single live region, which cancellation and return both report into. */
const feedback = (page: Page): Locator => page.getByRole('alert');

export const feedbackText = (page: Page, text: string): Locator => feedback(page).getByText(text);

export const orderStatusBadge = (page: Page, text: string): Locator =>
  orderDetailPage(page).getByText(text, { exact: true });
