import type { Locator, Page } from '@playwright/test';

// --- The tracking-consent form ---

// The form is a modal that sets no accessible name of its own, so the heading it
// renders is what separates it from the other dialogs the storefront mounts.
export const consentForm = (page: Page): Locator =>
  page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: 'Tracking Consent', exact: true }) });

export const consentHeading = (page: Page): Locator =>
  consentForm(page).getByRole('heading', { name: 'Tracking Consent', exact: true });

// Both choices carry an assistive label instead of taking their accessible name
// from the visible word. The responsive layout also renders one pair per
// breakpoint. Matching the role and that label resolves to the single pair a
// shopper can actually reach.
export const acceptTracking = (page: Page): Locator =>
  consentForm(page).getByRole('button', { name: 'Accept tracking', exact: true });

export const declineTracking = (page: Page): Locator =>
  consentForm(page).getByRole('button', { name: 'Decline tracking', exact: true });

export const dismissConsentForm = (page: Page): Locator =>
  consentForm(page).getByRole('button', { name: 'Close consent tracking form', exact: true });

export const consentDescription = (page: Page): Locator =>
  consentForm(page).getByRole('paragraph').first();

// --- The product page the analytics behaviour is read from ---

export const productDetail = (page: Page): Locator => page.getByTestId('product-details-page');
