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

export const startReturn = (page: Page): Locator =>
  page.getByTestId('account-order-detail-start-return');

/** The modal on a wide viewport, the drawer on a narrow one. */
const returnModal = (page: Page): Locator =>
  page.getByTestId('return-items-modal').or(page.getByTestId('return-items-modal-drawer'));

export const returnModalText = (page: Page, text: string): Locator =>
  returnModal(page).getByText(text);

export const itemRows = (page: Page): Locator =>
  returnModal(page).getByTestId('return-items-modal-item-row');

export const itemCheckbox = (row: Locator): Locator => row.getByRole('checkbox');

// A row only renders its quantity and reason controls once it is checked. That
// is what makes one of each per row unique.
export const itemQuantity = (row: Locator): Locator => row.getByRole('spinbutton');

export const itemReason = (row: Locator): Locator => row.getByRole('combobox');

export const rowText = (row: Locator, text: string): Locator => row.getByText(text);

export const reviewReturn = (page: Page): Locator =>
  returnModal(page).getByTestId('return-items-modal-review');

export const reviewRows = (page: Page): Locator =>
  returnModal(page).getByTestId('return-items-modal-review-row');

export const submitReturn = (page: Page): Locator =>
  returnModal(page).getByTestId('return-items-modal-submit');

/** The page's single live region, which cancellation and return both report into. */
const feedback = (page: Page): Locator => page.getByRole('alert');

export const feedbackText = (page: Page, text: string): Locator => feedback(page).getByText(text);
