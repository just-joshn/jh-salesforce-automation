import type { Locator, Page } from '@playwright/test';

/**
 * The increment/decrement/spinbutton quantity control for a single named line item.
 * The exact same control appears on both the cart page and the wishlist page (a genuine
 * shared UI widget, not a coincidence), so it is modeled once here and reused by both.
 */
export class QuantityStepper {
  readonly increment: Locator;
  readonly decrement: Locator;
  readonly spinbutton: Locator;

  constructor(page: Page, productName: string) {
    this.increment = page.getByRole('button', { name: `Increment Quantity for ${productName}` });
    this.decrement = page.getByRole('button', { name: `Decrement Quantity for ${productName}` });
    this.spinbutton = page.getByRole('spinbutton', { name: 'Quantity' });
  }
}
