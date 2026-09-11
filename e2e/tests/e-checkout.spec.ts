import { expect, test } from '../support/fixtures';
import { readAppConfig } from '../support/app-config';
import { CheckoutPage } from '../support/pages/checkout.page';
import { OrderHistoryPage } from '../support/pages/order-history.page';
import { addProductAndProceedToCheckout } from '../support/workflows';
import { proceedToCheckoutFromCartDialog } from '../support/ui/added-to-cart';
import { openPath } from '../support/site';
import {
  PICKUP_BILLING_ADDRESS,
  PRIMARY_ADDRESS,
  PRODUCTS,
  rejectedEmail,
  SECONDARY_ADDRESS,
  STORE_LOCATOR_ZIP,
  STORES,
  TEST_VISA,
  uniqueEmail,
} from '../support/test-data';

test.describe('E. Checkout', () => {
  test('E1 - Guest checkout — Ship to Address (Standard Delivery Purchase)', {
    tag: ['@critical', '@destructive', '@nightly'],
  }, async ({ page, checkoutPage }) => {
    await addProductAndProceedToCheckout(page, PRODUCTS.silkTie);
    await checkoutPage.expectLoaded();
    await checkoutPage.continueAsGuest(rejectedEmail('checkout'));
    await checkoutPage.fillShippingAddress(PRIMARY_ADDRESS);
    await checkoutPage.fillPayment(TEST_VISA);
    await test.step('A platform-rejected email fails at order placement with a graceful, in-place error', async () => {
      await checkoutPage.attemptPlaceOrder();
      await checkoutPage.expectOrderPlacementError();
      await checkoutPage.expectPlaceOrderAvailable();
    });
    const email = uniqueEmail('checkout');
    await test.step('Editing to a deliverable email preserves the rest of the order and succeeds', async () => {
      await checkoutPage.editContactInfo();
      await checkoutPage.continueAsGuest(email);
      await expect(page.getByText(PRIMARY_ADDRESS.address).first()).toBeVisible();
    });
    const order = await checkoutPage.placeOrder();
    expect(order.status).toBe(200);
    await checkoutPage.expectOrderConfirmation(order, email);
  });

  test('E2 - Guest checkout — Buy Online, Pick Up In Store', {
    tag: ['@critical', '@destructive', '@nightly'],
  }, async ({ page, productPage, checkoutPage }) => {
    await productPage.goto(PRODUCTS.hoopEarring);
    await productPage.selectFirstColorOption();

    await test.step('Resolving a pickup store on the PDP enables the Pick Up in Store option', async () => {
      const storeLocator = await productPage.openStorePicker();
      await storeLocator.getByRole('combobox').first().selectOption({ label: 'United States' });
      await storeLocator.getByRole('textbox', { name: 'Enter postal code' }).fill(STORE_LOCATOR_ZIP);
      const searchResponse = page.waitForResponse((res) => res.url().includes('store-search'));
      await storeLocator.getByRole('button', { name: 'Find' }).click();
      expect((await searchResponse).status()).toBe(200);
      const storeRadio = storeLocator
        .getByRole('radiogroup')
        .getByRole('radio')
        .nth(STORES.nearest.index);
      await expect(storeRadio).toBeVisible();
      await storeRadio.locator('..').click({ force: true });
      await storeLocator.getByRole('button', { name: 'Close' }).click();

      await productPage.choosePickUpInStore();
      await productPage.expectPickupStoreSelected(STORES.nearest.name);
    });

    await productPage.addToCart();
    await proceedToCheckoutFromCartDialog(page);

    await checkoutPage.continueAsGuest(uniqueEmail('pickup'));
    await expect(page.getByRole('heading', { name: 'Pickup Address & Information' })).toBeVisible();
    await expect(page.getByText(STORES.nearest.name)).toBeVisible();

    await checkoutPage.fillPayment(TEST_VISA, PICKUP_BILLING_ADDRESS);
    const order = await checkoutPage.placeOrder();
    expect(order.status).toBe(200);

    await expect(page.getByRole('heading', { name: 'Pickup Details' })).toBeVisible();
    await expect(page.getByText(STORES.nearest.name)).toBeVisible();
    await expect(page.getByText('Free').or(page.getByText(/[$£]0\.00/))).toBeVisible();
  });

  test('E3 - Multi-Shipment Checkout (split delivery to two addresses)', {
    tag: ['@critical', '@destructive', '@nightly'],
  }, async ({ page, productPage, checkoutPage }) => {
    await openPath(page, '');
    const config = await readAppConfig(page);
    expect(config.multishipEnabled).toBe(true);

    await productPage.goto(PRODUCTS.hoopEarring);
    await productPage.selectFirstColorOption();
    await productPage.addToCart();
    await page.getByRole('dialog', { name: 'Added to Cart' }).getByRole('button', { name: 'Close' }).click();

    await productPage.goto(PRODUCTS.silkTie);
    await productPage.selectFirstColorOption();
    await productPage.addToCart();
    await proceedToCheckoutFromCartDialog(page);

    await checkoutPage.continueAsGuest(uniqueEmail('multiship'));
    await checkoutPage.shipToMultipleAddresses();

    await test.step('Each line item gets its own delivery address', async () => {
      await checkoutPage.addMultiShipDeliveryAddress(PRODUCTS.hoopEarring.name, PRIMARY_ADDRESS);
      await checkoutPage.addMultiShipDeliveryAddress(PRODUCTS.silkTie.name, SECONDARY_ADDRESS);
    });

    await checkoutPage.continueWithSelectedDeliveryAddresses();
    await checkoutPage.continueToPaymentIfPrompted();

    await checkoutPage.fillPayment(TEST_VISA);
    const order = await checkoutPage.placeOrder();
    expect(order.status).toBe(200);

    // The multi-delivery confirmation summary can render a beat after the "Thank you"
    // heading placeOrder() already waited for, so give it its own generous timeout.
    const confirmationTimeout = 30_000;
    await expect(page.getByRole('heading', { name: 'Delivery 1' })).toBeVisible({
      timeout: confirmationTimeout,
    });
    await expect(page.getByRole('heading', { name: 'Delivery 2' })).toBeVisible({
      timeout: confirmationTimeout,
    });
    await expect(page.getByText(SECONDARY_ADDRESS.address).first()).toBeVisible();
  });

  test('E4 - Signed-in checkout (contact info pre-authenticated)', {
    tag: ['@critical', '@destructive', '@nightly'],
  }, async ({ signedInPage: page }) => {
    const checkoutPage = new CheckoutPage(page);

    await addProductAndProceedToCheckout(page, PRODUCTS.hoopEarring);
    await checkoutPage.expectSignedInContactInfo();

    const order = await checkoutPage.completeFromShippingStep(PRIMARY_ADDRESS, TEST_VISA);
    expect(order.status).toBe(200);
    await checkoutPage.expectOrderConfirmation(order);

    const orderHistoryPage = new OrderHistoryPage(page);
    await orderHistoryPage.goto();
    await orderHistoryPage.expectOrderListed(order.orderNumber);
  });
});
