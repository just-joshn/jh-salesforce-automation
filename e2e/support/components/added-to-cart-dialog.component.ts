import type { Locator, Page } from '@playwright/test';

/**
 * The "N item(s) added to cart" confirmation dialog — shared by every place an item can
 * be added to the basket (the product page, and the wishlist's "copy to cart" action).
 */
export class AddedToCartDialog {
  private readonly root: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole('dialog');
  }

  async waitForVisible(timeout = 25_000): Promise<void> {
    await this.root.getByRole('heading', { name: /added to cart/i }).waitFor({ timeout });
  }

  async close(): Promise<void> {
    await this.root.getByRole('button', { name: 'Close' }).click();
  }

  /** Follows the "Proceed to Checkout" shortcut straight into checkout. */
  async proceedToCheckout(): Promise<void> {
    await this.root.getByRole('link', { name: 'Proceed to Checkout' }).click();
  }

  async viewCart(): Promise<void> {
    await this.root.getByRole('link', { name: 'View Cart' }).click();
  }
}
