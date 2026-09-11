import { expect, type Locator, type Page, type Response } from '@playwright/test';

/**
 * The "Find a Store" UI appears twice with identical search-and-select behavior: embedded
 * in a `dialog` opened from a PDP's "Select Store" button (E2 passes that dialog `Locator`),
 * and standalone on /store-locator where there is no wrapper at all (F1 passes the `Page`).
 * `root` therefore stays the explicit first parameter of every helper here — it is the only
 * reason those two callers can share this code.
 */

/** Only a Locator has `.page()`; a Page is already its own owner. */
function ownerPage(root: Page | Locator): Page {
  return 'page' in root ? root.page() : root;
}

/**
 * A store's radio input carries no accessible name of its own (a real gap in the
 * storefront's markup), so a specific row can't be found by name at all. Results are
 * always distance-sorted by the API, so position is the stable, reliable handle instead
 * (paired with the store names in test-data.ts).
 */
export function storeRadioAt(root: Page | Locator, index: number): Locator {
  return root.getByRole('radiogroup').getByRole('radio').nth(index);
}

/** Fills and submits the postal-code search, returning the store-search API response. */
export async function searchStores(root: Page | Locator, zip: string): Promise<Response> {
  await root.getByRole('combobox').first().selectOption({ label: 'United States' });
  await root.getByRole('textbox', { name: 'Enter postal code' }).fill(zip);
  const searchResponse = ownerPage(root).waitForResponse((res) =>
    res.url().includes('store-search'),
  );
  await root.getByRole('button', { name: 'Find' }).click();
  return searchResponse;
}

/**
 * Selects a store from the results radio list by position. The hidden radio input is
 * controlled by its wrapper label, so click that wrapper to trigger the same change event
 * across browser engines — the same pointer-interception pattern E5 shows in checkout.
 */
export async function selectStoreAt(root: Page | Locator, index: number): Promise<void> {
  const storeRadio = storeRadioAt(root, index);
  await expect(storeRadio).toBeVisible();
  await storeRadio.locator('..').click({ force: true });
}
