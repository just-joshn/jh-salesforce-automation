import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The "Yes, remove ..." confirmation shared by cart, wishlist, and address book.
 */

/** Confirms the alert dialog that is already on screen. */
export async function confirmRemoval(page: Page): Promise<void> {
  const confirmButton = page.getByRole('alertdialog').getByRole('button', { name: /^Yes, remove/i });
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();
}

/** Confirms removal if it prompts, otherwise waits for the caller's removal completion state. */
export async function confirmRemovalIfPrompted(
  page: Page,
  completion: Locator,
): Promise<void> {
  const confirmButton = page.getByRole('button', { name: /^Yes, remove/i });
  await expect(confirmButton.or(completion).first()).toBeVisible({ timeout: 3000 });
  if (await completion.isVisible()) return;
  await confirmButton.click();
  await expect(confirmButton).toBeHidden();
}

/**
 * Clicks every matching Remove control until `emptyText` is all that's left.
 * Locators are lazy, so the same first() handle re-queries after each removal.
 */
export async function drainRemovals(
  page: Page,
  removeName: string | RegExp,
  emptyText: string,
): Promise<void> {
  const removeButton = page.getByRole('button', { name: removeName }).first();
  await expect(removeButton.or(page.getByText(emptyText)).first()).toBeVisible();
  while (await removeButton.isVisible()) {
    await removeButton.click();
    await confirmRemovalIfPrompted(page, page.getByText(emptyText));
  }
}
