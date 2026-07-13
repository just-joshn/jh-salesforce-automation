import { expect, type Page } from '@playwright/test';
import { AddressForm } from '../components/address-form.component';
import { ConfirmRemovalDialog } from '../components/confirm-removal-dialog.component';
import { openPath } from '../site';
import type { AddressInput } from '../test-data';

/** The /account/addresses page. */
export class AddressBookPage {
  private readonly confirmRemoval: ConfirmRemovalDialog;

  constructor(private readonly page: Page) {
    this.confirmRemoval = new ConfirmRemovalDialog(page);
  }

  async goto(): Promise<void> {
    await openPath(this.page, '/account/addresses');
  }

  /** Best-effort cleanup: removes every saved address so a test starts from a known-empty book. */
  async clear(): Promise<void> {
    await this.goto();
    let removeButton = this.page.getByRole('button', { name: /^Remove /i }).first();
    // Wait for the list to actually settle (populated or empty) once, so the loop's first
    // count() below can't race the page's own post-navigation render.
    await expect(removeButton.or(this.page.getByText('No Saved Addresses')).first()).toBeVisible();
    while (await removeButton.count()) {
      await removeButton.click();
      await this.confirmRemoval.confirmIfPrompted();
      removeButton = this.page.getByRole('button', { name: /^Remove /i }).first();
    }
  }

  /** B8: adds a new saved address, optionally flagged as default. */
  async add(address: AddressInput, setAsDefault = false): Promise<void> {
    await this.page.getByRole('button', { name: /add address/i }).click();
    await new AddressForm(this.page).fill(address);
    if (setAsDefault) {
      await this.page.getByRole('checkbox', { name: 'Set as default' }).check({ force: true });
    }
    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  async remove(addressLine: string): Promise<void> {
    await this.page.getByRole('button', { name: `Remove ${addressLine}` }).click();
    await this.confirmRemoval.confirmIfPrompted();
  }

  async expectEmpty(): Promise<void> {
    await expect(this.page.getByText('No Saved Addresses')).toBeVisible();
  }
}
