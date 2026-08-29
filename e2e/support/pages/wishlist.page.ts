import { expect, type Page } from '@playwright/test';
import { ConfirmRemovalDialog } from '../components/confirm-removal-dialog.component';
import { QuantityStepper } from '../components/quantity-stepper.component';
import { openPath } from '../site';

export class WishlistPage {
  private readonly confirmRemoval: ConfirmRemovalDialog;

  constructor(private readonly page: Page) {
    this.confirmRemoval = new ConfirmRemovalDialog(page);
  }

  async goto(): Promise<void> {
    await openPath(this.page, '/account/wishlist');
  }

  /** Best-effort cleanup: removes every wishlist item so a test starts from a known-empty list. */
  async clear(): Promise<void> {
    await this.goto();
    let removeButton = this.page.getByRole('button', { name: 'Remove' }).first();
    // Wait for the list to actually settle (populated or empty) once, so the loop's first
    // isVisible() below can't race the page's own post-navigation render.
    await expect(removeButton.or(this.page.getByText('No Wishlist Items')).first()).toBeVisible();
    while (await removeButton.isVisible()) {
      await removeButton.click();
      await this.confirmRemoval.confirmIfPrompted();
      removeButton = this.page.getByRole('button', { name: 'Remove' }).first();
    }
  }

  /** C2: removes the first wishlist row via its own "Confirm Remove Item" alert dialog. */
  async removeFirstItem(): Promise<void> {
    await this.page.getByRole('button', { name: 'Remove' }).first().click();
    const confirmDialog = this.page.getByRole('alertdialog');
    await expect(confirmDialog).toContainText('Confirm Remove Item');
    await confirmDialog.getByRole('button', { name: 'Yes, remove item' }).click();
  }

  /**
   * C3: clicks "Add to Cart" on a wishlist row. Assumes a single relevant row is present.
   * The button's accessible name is "Add {product name} to cart", not the plain "Add to
   * Cart" text used elsewhere (PDP, cart flyout), so it is matched by pattern here.
   */
  async addItemToCart(): Promise<void> {
    await this.page
      .getByRole('button', { name: /^Add .+ to cart$/i })
      .first()
      .click();
  }

  quantityStepper(productName: string): QuantityStepper {
    return new QuantityStepper(this.page, productName);
  }

  async expectEmpty(): Promise<void> {
    await expect(this.page.getByText('No Wishlist Items')).toBeVisible();
  }
}
