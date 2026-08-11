import type { Page } from '@playwright/test';

import { findTwoDistinctOrderableVariants } from '../../../api/support/products';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import * as Actions from './multi-shipment.actions';
import {
  addressLabel,
  createCheckoutInput,
  defaultShippingMethod,
  defaultShippingMethods,
  type JourneyProduct,
  recipientName,
  revalidationMethod,
} from './multi-shipment.data';
import * as Locators from './multi-shipment.locators';

/*
 * OUT OF SCOPE — CUJ 7 pain point step 2, "Incorrect quantity/shipment assignment":
 * "visual shipment grouping reduces mistakes" is a UX-research hypothesis, not a functional
 * observable. These tests assert assignment accuracy instead of claiming visual comprehension.
 */

const addProducts = async (
  page: Page,
  products: readonly [JourneyProduct, JourneyProduct],
): Promise<void> => {
  await Actions.addFirstProduct(page, products[0]);
  await expect(Locators.cartCountButton(page, 1)).toBeVisible();
  await Actions.addSecondProduct(page, products[1]);
  await expect(Locators.cartCountButton(page, 2)).toBeVisible();
  await Actions.openCart(page);
};

const addDestinations = async (
  page: Page,
  products: readonly [JourneyProduct, JourneyProduct],
  checkout: ReturnType<typeof createCheckoutInput>,
): Promise<void> => {
  await Actions.addDestination(page, products[0].productName, checkout.addresses[0]);
  await Actions.addDestination(page, products[1].productName, checkout.addresses[1]);
};

const assertConfirmation = async (
  page: Page,
  products: readonly [JourneyProduct, JourneyProduct],
  recipients: readonly [string, string],
): Promise<void> => {
  const deliveryHeadingCount = recipients[0] === recipients[1] ? 0 : 2;
  await expect(Locators.orderNumber(page)).toBeVisible();
  await expect(Locators.confirmationDeliveries(page)).toHaveCount(deliveryHeadingCount);
  await expect(
    Locators.confirmationShipmentItem(page, recipients[0], products[0].productName),
  ).toBeVisible();
  await expect(
    Locators.confirmationShipmentItem(page, recipients[1], products[1].productName),
  ).toBeVisible();
};

test('CUJ 7 — places one order with items assigned to two destinations', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const token = await getGuestToken(request);
  const products = await findTwoDistinctOrderableVariants(request, token.access_token);
  const checkout = createCheckoutInput();

  await test.step('Start multi-shipment checkout', async () => {
    await addProducts(page, products);
    await Actions.startMultiShipmentCheckout(page, checkout.email);
    await expect(Locators.returnToSingleShipmentButton(page)).toBeVisible();
  });

  await test.step('Assign products/quantities', async () => {
    await expect(Locators.assignmentProductImage(page, products[0].productName)).toBeVisible();
    await expect(Locators.assignmentProductImage(page, products[1].productName)).toBeVisible();
    await expect(Locators.assignedQuantity(page)).toHaveCount(2);
  });

  await test.step('Supply/select addresses or pickup locations', async () => {
    await addDestinations(page, products, checkout);
    await expect(
      Locators.selectedDeliveryAddress(
        page,
        products[0].productName,
        addressLabel(checkout.addresses[0]),
      ),
    ).toBeAttached();
    await expect(
      Locators.selectedDeliveryAddress(
        page,
        products[1].productName,
        addressLabel(checkout.addresses[1]),
      ),
    ).toBeAttached();
  });

  await test.step('Select valid shipping methods', async () => {
    await Actions.continueToShipping(page);
    await Actions.selectShippingMethods(page, defaultShippingMethods);
    await expect(Locators.multipleAddressesSummary(page)).toBeVisible();
    await expect(Locators.shippingSummaryMethod(page, defaultShippingMethod)).toHaveCount(2);
  });

  await test.step('Pay/place order', async () => {
    await Actions.payAndPlaceOrder(page, checkout.payment);
    await expect(Locators.confirmationHeading(page)).toBeVisible();
  });

  await test.step('Verify fulfillment in confirmation', async () => {
    await assertConfirmation(page, products, [
      recipientName(checkout.addresses[0]),
      recipientName(checkout.addresses[1]),
    ]);
    test.info().annotations.push({
      type: 'orderNo',
      description: (await Locators.orderNumber(page).textContent()) ?? '',
    });
  });
});

test('CUJ 7 — revalidates the shipping method when a destination changes', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const token = await getGuestToken(request);
  const products = await findTwoDistinctOrderableVariants(request, token.access_token);
  const checkout = createCheckoutInput();

  await test.step('Start multi-shipment checkout', async () => {
    await addProducts(page, products);
    await Actions.startMultiShipmentCheckout(page, checkout.email);
    await expect(Locators.returnToSingleShipmentButton(page)).toBeVisible();
  });

  await test.step('Assign products/quantities', async () => {
    await expect(Locators.assignmentProductImage(page, products[0].productName)).toBeVisible();
    await expect(Locators.assignmentProductImage(page, products[1].productName)).toBeVisible();
    await expect(Locators.assignedQuantity(page)).toHaveCount(2);
  });

  await test.step('Supply/select addresses or pickup locations', async () => {
    await addDestinations(page, products, checkout);
    await expect(
      Locators.selectedDeliveryAddress(
        page,
        products[0].productName,
        addressLabel(checkout.addresses[0]),
      ),
    ).toBeAttached();
    await expect(
      Locators.selectedDeliveryAddress(
        page,
        products[1].productName,
        addressLabel(checkout.addresses[1]),
      ),
    ).toBeAttached();
  });

  await test.step('Select valid shipping methods', async () => {
    await Actions.continueToShipping(page);
    await Actions.openShippingOptions(page);
    await expect(Locators.continueToPaymentButton(page)).toBeVisible();
    await expect(Locators.shippingMethodGroups(page)).toHaveCount(2);
    await Actions.selectFirstShipmentMethod(page, revalidationMethod);
    await Actions.changeDestination(
      page,
      products[0].productName,
      addressLabel(checkout.addresses[1]),
    );
    await expect(Locators.multipleAddressesSummary(page)).not.toBeVisible();
    await expect(Locators.editShippingAddressButton(page)).toBeVisible();
    await expect(Locators.shippingSummaryMethod(page, revalidationMethod)).toHaveCount(1);
    await expect(Locators.shippingSummaryMethod(page, defaultShippingMethod)).not.toBeVisible();
  });

  await test.step('Pay/place order', async () => {
    await Actions.payAndPlaceOrder(page, checkout.payment);
    await expect(Locators.confirmationHeading(page)).toBeVisible();
  });

  await test.step('Verify fulfillment in confirmation', async () => {
    const changedRecipient = recipientName(checkout.addresses[1]);
    await assertConfirmation(page, products, [changedRecipient, changedRecipient]);
    test.info().annotations.push({
      type: 'orderNo',
      description: (await Locators.orderNumber(page).textContent()) ?? '',
    });
  });
});
