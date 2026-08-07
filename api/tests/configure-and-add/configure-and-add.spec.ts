import { expect, test } from '@playwright/test';
import { required } from '../../support/scapi';
import type { Basket, Product } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import * as Actions from './configure-and-add.actions';
import {
  collectionStoreId,
  configuration,
  configuredProductItems,
  deliveryShipmentId,
  itemCount,
  lineFor,
  orderableVariant,
  selectedVariationName,
  shipmentById,
} from './configure-and-add.data';

// Choices made against the product resource must survive into the basket: same
// sellable id, options, amount, and delivery fulfillment.
test('configure a variant with a quantity and add it to the basket', async ({ request }) => {
  test.setTimeout(90000);

  const variant = await orderableVariant(request);
  const { accessToken } = await getGuestToken(request);

  const productResponse = await Actions.openProduct(request, accessToken, variant.masterId);
  expect(productResponse.status()).toBe(200);
  const master = (await productResponse.json()) as Product;

  // Substitutes the rendered product-detail assertion.
  expect(master.id).toBe(variant.masterId);

  expect(selectedVariationName(master, variant.variantId, 'color')).toBe(variant.colorName);
  expect(selectedVariationName(master, variant.variantId, 'size')).toBe(variant.sizeName);

  const productItems = configuredProductItems(variant.variantId);
  const [requestedItem] = productItems;
  if (requestedItem === undefined) throw new Error('configured product request has no item');

  // Substitutes the quantity input value: the API request carries the same chosen amount.
  expect(requestedItem.quantity).toBe(configuration.quantity);
  // Substitutes the selected delivery option: no store inventory or pickup shipment is requested.
  expect(requestedItem).toEqual({
    productId: variant.variantId,
    quantity: configuration.quantity,
  });
  // API counterpart of Add to Cart being enabled for the configured quantity.
  expect(variant.ats).toBeGreaterThanOrEqual(configuration.quantity);

  const createResponse = await Actions.createBasket(request, accessToken);
  expect(createResponse.status()).toBe(200);
  const basketId = required(((await createResponse.json()) as Basket).basketId, 'basketId');

  const addResponse = await Actions.addConfiguredProduct(
    request,
    accessToken,
    basketId,
    productItems,
  );
  expect(addResponse.status()).toBe(200);
  const addedBasket = (await addResponse.json()) as Basket;

  // Mutating response substitutes the confirmation dialog and its added-item heading.
  expect(itemCount(addedBasket)).toBe(configuration.quantity);

  const addedLine = lineFor(addedBasket, variant.variantId);
  expect(addedLine.productName).toBe(variant.productName);
  // Basket line's variant SKU resolves the same color and size shown in the confirmation.
  const addedProductId = required(addedLine.productId, 'productItems.productId');
  expect(selectedVariationName(master, addedProductId, 'color')).toBe(variant.colorName);
  expect(selectedVariationName(master, addedProductId, 'size')).toBe(variant.sizeName);
  expect(addedLine.quantity).toBe(configuration.quantity);

  const cartResponse = await Actions.openCart(request, accessToken, basketId);
  expect(cartResponse.status()).toBe(200);
  const cart = (await cartResponse.json()) as Basket;

  // Successful GET and quantity total substitute cart-container and cart-heading visibility.
  expect(itemCount(cart)).toBe(configuration.quantity);

  const cartLine = lineFor(cart, variant.variantId);
  expect(cartLine.productId).toBe(variant.variantId);
  expect(cartLine.quantity).toBe(configuration.quantity);
  expect(cartLine.shipmentId).toBe(deliveryShipmentId);
  expect(collectionStoreId(shipmentById(cart, deliveryShipmentId))).toBeUndefined();
});
