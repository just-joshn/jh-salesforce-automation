import type { Locator, Page } from '@playwright/test';

/**
 * The increment/decrement/spinbutton quantity control for a single named line item.
 * The exact same control appears on both the cart page and the wishlist page (a genuine
 * shared UI widget, not a coincidence), so it is resolved once here and reused by both.
 */
export function quantityStepper(
  page: Page,
  productName: string,
): { increment: Locator; decrement: Locator; spinbutton: Locator } {
  return {
    increment: page.getByRole('button', { name: `Increment Quantity for ${productName}` }),
    decrement: page.getByRole('button', { name: `Decrement Quantity for ${productName}` }),
    spinbutton: page.getByRole('spinbutton', { name: 'Quantity' }),
  };
}
