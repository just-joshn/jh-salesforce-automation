import type { Locator, Page } from '@playwright/test';

export const storefrontMain = (page: Page): Locator => page.getByRole('main');

export const accountButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'My Account', exact: true });

export const emailInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Email', exact: true });

export const passwordOption = (page: Page): Locator =>
  page.getByRole('button', { name: 'Password', exact: true });

export const passwordInput = (page: Page): Locator => page.getByLabel('Password', { exact: true });

export const signInButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Sign In', exact: true });

// Not live-observable without a configured shopper session; verified against the deployed template's
// account order-detail contract.
export const orderDetailsHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: 'Order Details', exact: true });

// Not live-observable without a configured shopper session; verified against the deployed template's
// account order-detail contract.
export const orderNumber = (page: Page, orderNo: string): Locator =>
  page.getByText(`Order Number: ${orderNo}`, { exact: true });

// Not live-observable without a configured shopper session; verified against the deployed template's
// account order-detail contract.
export const cancelOrderButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Cancel Order', exact: true });

// Not live-observable without a configured shopper session; verified against the deployed template's
// account order-detail contract.
export const cancellationDialog = (page: Page): Locator => page.getByRole('dialog');

// Not live-observable without a configured shopper session; verified against the deployed template's
// account order-detail contract.
export const cancellationReasonSelect = (page: Page): Locator =>
  page.getByLabel('Reason', { exact: true });

// Not live-observable without a configured shopper session; verified against the deployed template's
// account order-detail contract.
export const confirmCancellationButton = (page: Page): Locator =>
  cancellationDialog(page).getByRole('button', { name: 'Confirm Cancellation', exact: true });

// Not live-observable without a configured shopper session; verified against the deployed template's
// account order-detail contract.
export const cancellationSuccessAlert = (page: Page): Locator =>
  page.getByRole('alert').filter({ hasText: 'Order canceled' });

// Not live-observable without a configured shopper session; verified against the deployed template's
// account order-detail contract.
export const canceledOrderStatus = (page: Page): Locator => page.getByText('Canceled', { exact: true });
