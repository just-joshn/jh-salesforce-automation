import { expect, test } from '../support/fixtures';
import { StoreLocatorDialog } from '../support/components/store-locator-dialog.component';
import { openPath } from '../support/site';
import { STORE_LOCATOR_ZIP, STORES } from '../support/test-data';

test.describe('F. Store Locator', { tag: '@store-locator' }, () => {
  test('F1 - Find nearby stores by postal code', { tag: '@smoke' }, async ({ page }) => {
    await openPath(page, '/store-locator');
    await expect(page.getByRole('heading', { name: 'Find a Store' })).toBeVisible();

    const storeLocator = new StoreLocatorDialog(page);
    const searchResponse = await storeLocator.search(STORE_LOCATOR_ZIP);
    expect(searchResponse.status()).toBe(200);

    await expect(page.getByText(STORES.nearest.name)).toBeVisible();
    await expect(page.getByText(STORES.inRange.name)).toBeVisible();
    await expect(page.getByText(STORES.outOfRange.name)).toBeVisible();

    await test.step('The out-of-range store is disabled rather than silently omitted', async () => {
      await expect(storeLocator.storeRadioAt(STORES.outOfRange.index)).toBeDisabled();
    });

    await test.step('The in-range store remains selectable', async () => {
      await storeLocator.selectStore(STORES.inRange.index);
      await expect(storeLocator.storeRadioAt(STORES.inRange.index)).toBeChecked();
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
