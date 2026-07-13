import { expect, type Page } from '@playwright/test';
import { ConfirmRemovalDialog } from '../components/confirm-removal-dialog.component';
import { QuantityStepper } from '../components/quantity-stepper.component';
import { openPath } from '../site';

export class CartPage {
  private readonly confirmRemoval: ConfirmRemovalDialog;

  constructor(private readonly page: Page) {
    this.confirmRemoval = new ConfirmRemovalDialog(page);
  }

  async goto(): Promise<void> {
    await openPath(this.page, '/cart');
  }

  /** Cart quantity stepper controls for a single named line item. */
  quantityStepper(productName: string): QuantityStepper {
    return new QuantityStepper(this.page, productName);
  }

  /** Removes the first cart line item and confirms the "Yes, remove item" dialog. */
  async removeFirstItem(): Promise<void> {
    await this.page.getByRole('button', { name: 'Remove' }).first().click();
    await this.page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Yes, remove item' })
      .click();
  }

  /** Best-effort cleanup: empties the cart so a test starts from a known-empty basket. */
  async clear(): Promise<void> {
    await this.goto();
    let removeButton = this.page.getByRole('button', { name: 'Remove' }).first();
    // Wait for the cart to actually settle (populated or empty) once, so the loop's first
    // count() below can't race the page's own post-navigation render.
    await expect(removeButton.or(this.page.getByText('Your cart is empty.')).first()).toBeVisible();
    while (await removeButton.count()) {
      await removeButton.click();
      await this.confirmRemoval.confirmIfPrompted();
      removeButton = this.page.getByRole('button', { name: 'Remove' }).first();
    }
  }

  async expectItemCount(count: number): Promise<void> {
    // The header badge can render a beat after its underlying basket-mutation API call
    // has already resolved successfully (observed directly under live-site load).
    await expect(
      this.page.getByRole('button', { name: `My cart, number of items: ${count}` }),
    ).toBeVisible({ timeout: 20_000 });
  }

  async expectEmpty(): Promise<void> {
    await expect(this.page.getByText('Your cart is empty.')).toBeVisible();
  }
}
