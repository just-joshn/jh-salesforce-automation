import { expect, type Page } from '@playwright/test';

/**
 * The "Yes, remove ..." confirmation that sometimes appears after clicking a Remove
 * button (address book, wishlist, cart). A tiny, stateless, cross-cutting UI element —
 * modeled as a component so every page with removable rows shares one implementation
 * instead of three copies of the same wait-and-click.
 */
export class ConfirmRemovalDialog {
  constructor(private readonly page: Page) {}

  /** Confirms removal if the dialog appeared; a no-op if the action didn't prompt for one. */
  async confirmIfPrompted(): Promise<void> {
    const confirmButton = this.page.getByRole('button', { name: /^Yes, remove/i });
    try {
      await expect(confirmButton).toBeVisible({ timeout: 3000 });
      await confirmButton.click();
    } catch {
      // This remove action did not prompt for confirmation.
    }
  }
}
