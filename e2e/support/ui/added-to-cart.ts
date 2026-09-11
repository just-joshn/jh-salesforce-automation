import type { Page } from '@playwright/test';

/**
 * The "N item(s) added to cart" confirmation dialog is shared by every place an item can
 * be added to the basket, but only its "Proceed to Checkout" shortcut is reused across
 * spec files — so that single interaction lives here as a stateless helper.
 */

/** Follows the dialog's "Proceed to Checkout" shortcut straight into checkout. */
export async function proceedToCheckoutFromCartDialog(page: Page): Promise<void> {
  await page.getByRole('dialog').getByRole('link', { name: 'Proceed to Checkout' }).click();
}
