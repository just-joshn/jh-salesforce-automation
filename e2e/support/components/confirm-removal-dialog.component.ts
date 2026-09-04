import { expect, type Page } from '@playwright/test';

/**
 * The "Yes, remove ..." confirmation shared by cart, wishlist, and address book.
 */
export class ConfirmRemovalDialog {
  constructor(private readonly page: Page) {}

  /** Confirms the alert dialog that is already on screen. */
  async confirm(): Promise<void> {
    const confirmButton = this.page
      .getByRole('alertdialog')
      .getByRole('button', { name: /^Yes, remove/i });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
  }

  /** Confirms removal if the dialog appeared; a no-op if the action didn't prompt. */
  async confirmIfPrompted(): Promise<void> {
    const confirmButton = this.page.getByRole('button', { name: /^Yes, remove/i });
    try {
      await expect(confirmButton).toBeVisible({ timeout: 3000 });
      await confirmButton.click();
    } catch {
      // This remove action did not prompt for confirmation.
    }
  }

  /**
   * Clicks every matching Remove control until `emptyText` is all that's left.
   * Locators are lazy, so the same first() handle re-queries after each removal.
   */
  async drain(removeName: string | RegExp, emptyText: string): Promise<void> {
    const removeButton = this.page.getByRole('button', { name: removeName }).first();
    await expect(removeButton.or(this.page.getByText(emptyText)).first()).toBeVisible();
    while (await removeButton.isVisible()) {
      await removeButton.click();
      await this.confirmIfPrompted();
    }
  }
}
