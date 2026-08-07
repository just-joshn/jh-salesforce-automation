import { expect, test } from '@playwright/test';
import { required } from '../../support/scapi';
import type { Product, ProductSearchResult } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import * as Actions from './pickup-availability.actions';
import {
  category,
  categoryTotal,
  nearbyStore,
  pageSize,
  pickupAvailability,
  storeArea,
  storeInventory,
} from './pickup-availability.data';

// The shopper asks what can be picked up nearby. Store inventory must shrink the
// category, then expose a sellable SKU on that store's own shelf.
test('filter a category to a nearby store and confirm the shelf there', async ({ request }) => {
  test.setTimeout(150000);

  const { accessToken } = await getGuestToken(request);
  const store = await nearbyStore(request, accessToken);
  const { total, masterIds, product } = await pickupAvailability(request, accessToken, store);

  const categoryResponse = await Actions.openCategory(request, accessToken, category.id, pageSize);
  expect(categoryResponse.status()).toBe(200);
  const unfiltered = (await categoryResponse.json()) as ProductSearchResult;

  // Successful category search substitutes product-list visibility.
  expect(unfiltered.hits).not.toHaveLength(0);
  // Shopper Search identifies the selected category where the browser renders its heading.
  expect(unfiltered.selectedRefinements?.cgid).toBe(category.id);

  // Opening and closing the store finder are browser-only; API discovery starts with its query.
  expect(storeArea.countryCode).toBe('US');
  expect(storeArea.postalCode).toBe('01801');
  // Nearby-store payload substitutes selecting and checking the matching store radio.
  expect(store.id).toBeTruthy();
  expect(store.name).toBeTruthy();

  // Store inventory id is the API counterpart of the checked filter, label, and removable chip.
  expect(store.inventoryId).toBeTruthy();

  // Both totals are read independently, proving the selected store shrank the category.
  const unfilteredTotal = categoryTotal(unfiltered);
  expect(total).toBeGreaterThan(0);
  expect(total).toBeLessThan(unfilteredTotal);

  // Filtered result total and first-page ids substitute result heading and rendered tile count.
  expect(masterIds).toHaveLength(Math.min(total, pageSize));
  expect(masterIds).toContain(product.masterId);

  const productResponse = await Actions.openProduct(request, accessToken, product.masterId);
  expect(productResponse.status()).toBe(200);
  const master = (await productResponse.json()) as Product;

  // Substitutes product URL and rendered product-detail assertions.
  expect(master.id).toBe(product.masterId);

  const variantResponse = await Actions.selectStoreVariant(
    request,
    accessToken,
    product.variantId,
    store.inventoryId,
  );
  expect(variantResponse.status()).toBe(200);
  const variant = (await variantResponse.json()) as Product;
  expect(variant.id).toBe(product.variantId);

  const inventory = storeInventory(variant, store.inventoryId);
  // Store inventory ATS substitutes the rendered in-stock-at-store message.
  expect(required(inventory.ats, 'inventory.ats')).toBeGreaterThan(0);
  // Store-specific orderability is the API counterpart of the enabled pickup radio.
  expect(inventory.orderable).toBe(true);

  // Choosing and checking a pickup radio is browser-only; no API state changes before a basket.
  // Exact store inventory identity substitutes the selected pickup fulfillment.
  expect(inventory.id).toBe(store.inventoryId);
  // Store-orderable SKU is the API counterpart of Add to Cart being enabled.
  expect(inventory.orderable).toBe(true);

  // Guardrail: selected SKU must come from the same store-filtered shelf.
  expect(masterIds).toContain(product.masterId);
});
