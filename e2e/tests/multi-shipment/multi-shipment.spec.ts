import type { APIRequestContext, APIResponse, Page } from '@playwright/test';

import { findOrderableVariant, MINIMUM_AVAILABLE_TO_SELL } from '../../../api/support/products';
import { bearer, required, shopperApiUrl, withSite } from '../../../api/support/scapi';
import type { Product, ProductSearchResult } from '../../../api/support/scapi-types';
import { getGuestToken } from '../../../api/support/slas';
import { expect, test } from '../../support/fixtures';
import * as Actions from './multi-shipment.actions';
import {
  addressLabel,
  createCheckoutInput,
  type JourneyProduct,
  recipientName,
} from './multi-shipment.data';
import * as Locators from './multi-shipment.locators';

/*
 * OUT OF SCOPE — CUJ 7 pain point step 2, "Incorrect quantity/shipment assignment":
 * "visual shipment grouping reduces mistakes" is a UX-research hypothesis, not a functional
 * observable. These tests assert assignment accuracy instead of claiming visual comprehension.
 */

const SHIPPING_METHODS = ['Ground', 'Ground'] as const;
const REVALIDATION_METHOD = '2-Day Express';

const requireSuccess = async (response: APIResponse, operation: string): Promise<void> => {
  if (!response.ok()) {
    throw new Error(`${operation} failed with HTTP ${response.status()}: ${await response.text()}`);
  }
};

const fetchProduct = async (
  request: APIRequestContext,
  accessToken: string,
  productId: string,
): Promise<Product> => {
  const response = await request.get(
    shopperApiUrl('product/shopper-products', `products/${encodeURIComponent(productId)}`),
    { headers: bearer(accessToken), params: withSite({ expand: 'availability,variations' }) },
  );
  await requireSuccess(response, `SCAPI product ${productId}`);
  return (await response.json()) as Product;
};

const toJourneyProduct = (
  master: Product,
  stockedProduct: Product,
  variantId: string,
): JourneyProduct | undefined => {
  const inventory = stockedProduct.inventory;
  if (!inventory?.orderable || inventory.ats === undefined) {
    return undefined;
  }
  if (inventory.ats < MINIMUM_AVAILABLE_TO_SELL) {
    return undefined;
  }

  return {
    availableToSell: inventory.ats,
    productId: required(master.id, 'product.id'),
    productName: required(master.name, 'product.name'),
    variantId,
  };
};

const findVariantCandidate = async (
  request: APIRequestContext,
  accessToken: string,
  master: Product,
): Promise<JourneyProduct | undefined> => {
  for (const variant of master.variants ?? []) {
    if (!variant.orderable) {
      continue;
    }
    const product = await fetchProduct(request, accessToken, variant.productId);
    const candidate = toJourneyProduct(master, product, variant.productId);
    if (candidate) {
      return candidate;
    }
  }
  return undefined;
};

const findCandidateInProduct = async (
  request: APIRequestContext,
  accessToken: string,
  master: Product,
): Promise<JourneyProduct | undefined> => {
  const productType = master.type;
  if (productType && (productType.bundle || productType.set)) {
    return undefined;
  }
  const standalone = toJourneyProduct(master, master, required(master.id, 'product.id'));
  if (standalone) {
    return standalone;
  }
  return findVariantCandidate(request, accessToken, master);
};

const searchCatalog = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<ProductSearchResult> => {
  const response = await request.get(shopperApiUrl('search/shopper-search', 'product-search'), {
    headers: bearer(accessToken),
    params: withSite({ limit: '24', refine: 'cgid=root' }),
  });
  await requireSuccess(response, 'SCAPI product search');
  return (await response.json()) as ProductSearchResult;
};

const findDistinctProduct = async (
  request: APIRequestContext,
  accessToken: string,
  excludedProductId: string,
): Promise<JourneyProduct> => {
  const catalog = await searchCatalog(request, accessToken);
  for (const hit of catalog.hits ?? []) {
    if (hit.productId !== excludedProductId) {
      const master = await fetchProduct(request, accessToken, hit.productId);
      const candidate = await findCandidateInProduct(request, accessToken, master);
      if (candidate) {
        return candidate;
      }
    }
  }
  throw new Error('No second distinct orderable product was found in the current catalog sample');
};

const resolveProducts = async (
  request: APIRequestContext,
): Promise<readonly [JourneyProduct, JourneyProduct]> => {
  const token = await getGuestToken(request);
  const resolved = await findOrderableVariant(request, token.access_token);
  const resolvedMaster = await fetchProduct(request, token.access_token, resolved.productId);
  const first =
    (await findCandidateInProduct(request, token.access_token, resolvedMaster)) ??
    (await findDistinctProduct(request, token.access_token, resolved.productId));
  const second = await findDistinctProduct(request, token.access_token, first.productId);
  return [first, second];
};

const addProducts = async (
  page: Parameters<typeof Actions.addFirstProduct>[0],
  products: readonly [JourneyProduct, JourneyProduct],
): Promise<void> => {
  await Actions.addFirstProduct(page, products[0]);
  await expect(Locators.cartCountButton(page, 1)).toBeVisible();
  await Actions.addSecondProduct(page, products[1]);
  await expect(Locators.cartCountButton(page, 2)).toBeVisible();
  await Actions.openCart(page);
};

const addDestinations = async (
  page: Parameters<typeof Actions.addDestination>[0],
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
  const products = await resolveProducts(request);
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
    await Actions.selectShippingMethods(page, SHIPPING_METHODS);
    await expect(Locators.multipleAddressesSummary(page)).toBeVisible();
    await expect(Locators.shippingSummaryMethod(page, 'Ground')).toHaveCount(2);
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
    console.log(`CUJ 7 multi-shipment order ${await Locators.orderNumber(page).textContent()}`);
  });
});

test('CUJ 7 — revalidates the shipping method when a destination changes', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const products = await resolveProducts(request);
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
    await Actions.selectFirstShipmentMethod(page, REVALIDATION_METHOD);
    await Actions.changeDestination(
      page,
      products[0].productName,
      addressLabel(checkout.addresses[1]),
    );
    await expect(Locators.multipleAddressesSummary(page)).not.toBeVisible();
    await expect(Locators.editShippingAddressButton(page)).toBeVisible();
    await expect(Locators.shippingSummaryMethod(page, REVALIDATION_METHOD)).toHaveCount(1);
    await expect(Locators.shippingSummaryMethod(page, 'Ground')).not.toBeVisible();
  });

  await test.step('Pay/place order', async () => {
    await Actions.payAndPlaceOrder(page, checkout.payment);
    await expect(Locators.confirmationHeading(page)).toBeVisible();
  });

  await test.step('Verify fulfillment in confirmation', async () => {
    const changedRecipient = recipientName(checkout.addresses[1]);
    await assertConfirmation(page, products, [changedRecipient, changedRecipient]);
    console.log(`CUJ 7 revalidation order ${await Locators.orderNumber(page).textContent()}`);
  });
});
