import { expect, test } from '../support/fixtures';
import { openPath } from '../support/site';
import { STORE_LOCATOR_ZIP, STORES } from '../support/test-data';
import { searchStores, selectStoreAt, storeRadioAt } from '../support/ui/store-locator';

test.describe('F. Store Locator', { tag: '@store-locator' }, () => {
  test('F1 - Find nearby stores by postal code', { tag: '@smoke' }, async ({ page }) => {
    await openPath(page, '/store-locator');
    await expect(page.getByRole('heading', { name: 'Find a Store' })).toBeVisible();

    const searchResponse = await searchStores(page, STORE_LOCATOR_ZIP);
    expect(searchResponse.status()).toBe(200);

    await expect(page.getByText(STORES.nearest.name)).toBeVisible();
    await expect(page.getByText(STORES.inRange.name)).toBeVisible();
    await expect(page.getByText(STORES.outOfRange.name)).toBeVisible();

    await test.step('The out-of-range store is disabled rather than silently omitted', async () => {
      await expect(storeRadioAt(page, STORES.outOfRange.index)).toBeDisabled();
    });

    await test.step('The in-range store remains selectable', async () => {
      await selectStoreAt(page, STORES.inRange.index);
      await expect(storeRadioAt(page, STORES.inRange.index)).toBeChecked();
    });
  });

  test('F2 - "Use My Location" geolocation branch', { tag: '@smoke' }, async ({
    locationDeniedPage: page,
  }) => {
    await openPath(page, '/store-locator');
    await page.getByRole('button', { name: 'Use My Location' }).click();
    await expect(page.getByText('To use your location, enable location sharing.')).toBeVisible();

    // The ZIP-based list stays fully usable underneath the fallback copy.
    await expect(page.getByRole('textbox', { name: 'Enter postal code' })).toBeEditable();
  });
});
