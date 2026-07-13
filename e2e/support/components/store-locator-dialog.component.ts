import type { Locator, Page, Response } from '@playwright/test';

/**
 * The "Find a Store" UI — a genuine Component Object (page-object-model.md's dialog/modal
 * pattern): the exact same search-and-select interaction appears twice, embedded in a
 * `dialog` opened from a PDP's "Select Store" button, and standalone on /store-locator
 * where there is no dialog wrapper, just the page itself. `root` captures that difference
 * once, in the constructor, so every method below works unchanged in either context.
 */
export class StoreLocatorDialog {
  readonly root: Page | Locator;

  constructor(root: Page | Locator) {
    this.root = root;
  }

  /** Only a Locator has `.page()`; a Page is already its own owner. */
  private get ownerPage(): Page {
    return 'page' in this.root ? this.root.page() : this.root;
  }

  /**
   * A store's radio input carries no accessible name of its own (a real gap in the
   * storefront's markup), so a specific row can't be found by name at all. Results are
   * always distance-sorted by the API, so position is the stable, reliable handle instead
   * (paired with the store names in test-data.ts).
   */
  storeRadioAt(index: number): Locator {
    return this.root.getByRole('radiogroup').getByRole('radio').nth(index);
  }

  /** Fills and submits the postal-code search, returning the store-search API response. */
  async search(zip: string): Promise<Response> {
    await this.root.getByRole('combobox').first().selectOption({ label: 'United States' });
    await this.root.getByRole('textbox', { name: 'Enter postal code' }).fill(zip);
    const searchResponse = this.ownerPage.waitForResponse((res) =>
      res.url().includes('store-search'),
    );
    await this.root.getByRole('button', { name: 'Find' }).click();
    return searchResponse;
  }

  /**
   * Selects a store from the results radio list by position. The hidden radio input is
   * controlled by its wrapper label, so click that wrapper to trigger the same change event
   * across browser engines — the same pointer-interception pattern E5 shows in checkout.
   */
  async selectStore(index: number): Promise<void> {
    const storeRadio = this.storeRadioAt(index);
    await storeRadio.waitFor({ state: 'visible' });
    await storeRadio.locator('..').click({ force: true });
  }

  /** Closes the dialog. Only meaningful when `root` is the PDP's dialog, not the standalone page. */
  async close(): Promise<void> {
    await this.root.getByRole('button', { name: 'Close' }).click();
  }
}

/** Opens the store picker from a PDP's "Select Store" link and returns its dialog. */
export async function openStorePickerFromPdp(page: Page): Promise<StoreLocatorDialog> {
  await page.getByRole('button', { name: 'Select Store' }).click();
  const dialog = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: 'Find a Store' }) });
  await dialog.waitFor({ state: 'visible' });
  return new StoreLocatorDialog(dialog);
}
