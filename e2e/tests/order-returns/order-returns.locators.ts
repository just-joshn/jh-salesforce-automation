import type { Locator, Page } from '@playwright/test';

import { returnUiText } from './order-returns.data';

// Unobserved on public demo: OMS is inactive, so seeded OMS order detail and return UI cannot render.
export const returnModal = (page: Page): Locator =>
  page.getByRole('dialog', { name: returnUiText.returnModal });

// Unobserved on public demo: return action exists only for OMS-ingested orders.
export const startReturnButton = (page: Page): Locator =>
  page.getByRole('button', { name: returnUiText.startReturn });

// Unobserved on public demo: OMS order lines are identified by rendered product name in return UI.
export const returnItem = (page: Page, itemName: string): Locator =>
  returnModal(page).getByRole('listitem').filter({ hasText: itemName });

// Unobserved on public demo: each OMS return line exposes its own selection control.
export const returnItemCheckbox = (page: Page, itemName: string): Locator =>
  returnItem(page, itemName).getByRole('checkbox', { name: itemName });

// Unobserved on public demo: each OMS return line exposes its own quantity input.
export const returnQuantityInput = (page: Page, itemName: string): Locator =>
  returnItem(page, itemName).getByRole('spinbutton', { name: returnUiText.quantity });

// Unobserved on public demo: OMS metadata supplies dynamic return reasons for this control.
export const returnReasonSelect = (page: Page): Locator =>
  returnModal(page).getByRole('combobox', { name: returnUiText.reason });

// Unobserved on public demo: this advances the selected return to review without submitting it.
export const reviewReturnButton = (page: Page): Locator =>
  returnModal(page).getByRole('button', { name: returnUiText.reviewReturn });

// Unobserved on public demo: this submits an OMS-validated return from the review modal.
export const submitReturnButton = (page: Page): Locator =>
  returnModal(page).getByRole('button', { name: returnUiText.submitReturn });

// Unobserved on public demo: accepted OMS returns refresh this Order Detail status.
export const returnSubmittedStatus = (page: Page): Locator =>
  page.getByRole('status', { name: returnUiText.returnSubmitted });
