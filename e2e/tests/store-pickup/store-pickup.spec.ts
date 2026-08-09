import { findOrderableVariant } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';
import { findPickupStore, findUnavailablePickupCombination } from '../../../api/support/stores';
import { expect, test } from '../../support/fixtures';
import * as Actions from './store-pickup.actions';
import * as Data from './store-pickup.data';
import * as Locators from './store-pickup.locators';

/**
 * Out of scope pain points:
 * - Step 2, "Inventory can change": forcing late stock loss requires faking live SCAPI inventory.
 * - Step 4, "Pickup shipment becomes invalid": forcing invalidation requires faking live SCAPI.
 * SCAPI mocking is banned, and either condition would disrupt this shared public demo.
 */

test('CUJ 6 — places a confirmed pickup order for the selected store', async ({ page, request }) => {
  const token = await getGuestToken(request);
  const pickupStore = await findPickupStore(request, token.access_token);
  const product = await findOrderableVariant(request, token.access_token);
  const store = Data.toStoreSelection(pickupStore);
  const checkout = Data.createCheckoutData();

  await test.step('Find/select store', async () => {
    await Actions.visitStorefront(page);
    await Actions.selectStore(page, store);
    await expect(Locators.storeRadio(page, store.name)).toBeChecked();
    await expect(Locators.storeName(page, store.name)).toBeVisible();
  });

  await test.step('Find store-available product', async () => {
    await Actions.openPickupProduct(page, product);
    await expect(Locators.productHeading(page, product.productName)).toBeVisible();
    await expect(Locators.inStockAtStore(page)).toBeVisible();
    await expect(Locators.selectedStoreButton(page, store.name)).toBeVisible();
  });

  await test.step('Add as Pickup in Store', async () => {
    await Actions.addForPickupAndViewCart(page);
    await expect(Locators.cartPickupSummary(page)).toBeVisible();
    await expect(Locators.storeName(page, store.name)).toBeVisible();
  });

  await test.step('Preserve pickup shipment through checkout', async () => {
    await Actions.startGuestCheckout(page, checkout.email);
    await expect(Locators.pickupAddressHeading(page)).toBeVisible();
    await expect(Locators.storeName(page, store.name)).toBeVisible();
  });

  await test.step('Pay/place order', async () => {
    await Actions.payAndPlaceOrder(page, checkout);
    await expect(Locators.confirmationHeading(page)).toBeVisible();
    await expect(Locators.confirmationOrderNumber(page)).toBeVisible();
    const orderNumber = Data.orderNumberFromConfirmation(
      await Locators.confirmationOrderNumber(page).textContent(),
    );
    console.log(`Real pickup order number: ${orderNumber}`);
  });

  await test.step('Receive pickup confirmation', async () => {
    await expect(Locators.pickupDetailsHeading(page)).toBeVisible();
    await expect(Locators.pickupAddressConfirmationHeading(page)).toBeVisible();
    await expect(Locators.storeName(page, store.name)).toBeVisible();
  });
});

test('CUJ 6 — does not offer pickup at a store without the required inventory', async ({
  page,
  request,
}) => {
  const token = await getGuestToken(request);
  const combination = await findUnavailablePickupCombination(request, token.access_token);

  switch (combination.kind) {
    case 'none-found':
      test.skip(true, combination.reason);
      return;
    case 'found': {
      const store = Data.toStoreSelection(combination.store);

      await test.step('Find/select store', async () => {
        await Actions.visitStorefront(page);
        await Actions.selectStore(page, store);
        await expect(Locators.storeRadio(page, store.name)).toBeChecked();
      });

      await test.step('Verify unavailable pickup location', async () => {
        await Actions.openUnavailableProduct(page, combination.productId);
        await expect(Locators.outOfStockAtStore(page)).toBeVisible();
        await expect(Locators.selectedStoreButton(page, store.name)).toBeVisible();
        await expect(Locators.pickupOption(page)).toBeDisabled();
      });
    }
  }
});
