import { expect, test } from '@playwright/test';
import { required } from '../../support/scapi';
import type { Basket, Customer, Product } from '../../support/scapi-types';
import { getGuestToken, loginRegisteredShopper, requireSession } from '../../support/slas';
import * as Actions from './wishlist.actions';
import {
  basketLineFor,
  hasVariationAttribute,
  itemFor,
  isMasterProduct,
  isOrderableProduct,
  isVariantProduct,
  newCredentials,
  orderableVariant,
  productListFrom,
  productListItemFrom,
  registrant,
  variantDisplayName,
  variantFromMaster,
  variationDisplayName,
} from './wishlist.data';

test('save a product for later in the wishlist', async ({ request }) => {
  test.setTimeout(120000);
  const credentials = newCredentials();
  const guest = await getGuestToken(request);

  const registration = await Actions.registerCustomer(
    request,
    guest.accessToken,
    registrant(credentials),
  );
  expect(registration.status()).toBe(200);
  const variant = await orderableVariant(request, guest.accessToken);

  const login = await loginRegisteredShopper(request, credentials.email, credentials.password);
  expect(login.loginStatus).toBe(303);
  const session = requireSession(login, credentials.email);

  const customerResponse = await Actions.readCustomer(
    request,
    session.accessToken,
    session.customerId,
  );
  expect(customerResponse.status()).toBe(200);
  const customer = (await customerResponse.json()) as Customer;

  // Browser-only assertion: Log Out is attached. API proof is the registered
  // token reading its matching customer.
  expect(customer.authType).toBe('registered');
  expect(customer.email).toBe(credentials.email);

  const wishlistResponse = await Actions.createWishlist(
    request,
    session.accessToken,
    session.customerId,
  );
  expect(wishlistResponse.status()).toBe(200);
  const wishlist = productListFrom(await wishlistResponse.json());
  const listId = required(wishlist.id, 'wishlist id');
  expect(wishlist.type).toBe('wish_list');

  const productSurfaceResponse = await Actions.readProduct(
    request,
    session.accessToken,
    variant.masterId,
  );
  expect(productSurfaceResponse.status()).toBe(200);
  const master = (await productSurfaceResponse.json()) as Product;

  // Browser-only assertion: product detail is visible. API proof is the exact
  // master product payload used to resolve the shopper's choices.
  expect(master.id).toBe(variant.masterId);
  expect(master.name).toBe(variant.productName);

  const selectedVariant = variantFromMaster(master, variant.variantId);

  // Browser-only steps: choose colour and size. The master's variant mapping
  // proves those same displayed values resolve to the chosen SKU.
  expect(variantDisplayName(master, selectedVariant, 'color')).toBe(variant.colorName);
  expect(variantDisplayName(master, selectedVariant, 'size')).toBe(variant.sizeName);

  const savedResponse = await Actions.addWishlistItem(
    request,
    session.accessToken,
    session.customerId,
    listId,
    variant.variantId,
  );
  expect(savedResponse.status()).toBe(200);
  expect(productListItemFrom(await savedResponse.json()).productId).toBe(variant.variantId);

  const reopenedResponse = await Actions.readWishlist(
    request,
    session.accessToken,
    session.customerId,
    listId,
  );
  expect(reopenedResponse.status()).toBe(200);
  const reopened = productListFrom(await reopenedResponse.json());
  expect(itemFor(reopened, variant.variantId).quantity).toBe(1);

  const hydratedResponse = await Actions.readProduct(
    request,
    session.accessToken,
    variant.variantId,
  );
  expect(hydratedResponse.status()).toBe(200);
  const hydrated = (await hydratedResponse.json()) as Product;

  // Browser-only wishlist heading/detail assertions. Shopper Products hydrates
  // the saved SKU with the same product name, colour, and size.
  expect(hydrated.name).toBe(variant.productName);
  expect(variationDisplayName(hydrated, 'color')).toBe(variant.colorName);
  expect(variationDisplayName(hydrated, 'size')).toBe(variant.sizeName);

  // Browser-only assertion: Add to Cart is offered on the list item. A resolved,
  // orderable variant is the API condition for direct basket creation.
  expect(isVariantProduct(hydrated)).toBe(true);
  expect(isOrderableProduct(hydrated)).toBe(true);
});

test('resume a purchase from the wishlist', async ({ request }) => {
  test.setTimeout(120000);
  const credentials = newCredentials();
  const guest = await getGuestToken(request);

  const registration = await Actions.registerCustomer(
    request,
    guest.accessToken,
    registrant(credentials),
  );
  expect(registration.status()).toBe(200);
  const variant = await orderableVariant(request, guest.accessToken);

  const login = await loginRegisteredShopper(request, credentials.email, credentials.password);
  expect(login.loginStatus).toBe(303);
  const session = requireSession(login, credentials.email);

  const customerResponse = await Actions.readCustomer(
    request,
    session.accessToken,
    session.customerId,
  );
  expect(customerResponse.status()).toBe(200);
  const customer = (await customerResponse.json()) as Customer;

  // Browser-only assertion: Log Out is attached. API proof is the registered
  // token reading its matching customer.
  expect(customer.authType).toBe('registered');
  expect(customer.email).toBe(credentials.email);

  const wishlistResponse = await Actions.createWishlist(
    request,
    session.accessToken,
    session.customerId,
  );
  expect(wishlistResponse.status()).toBe(200);
  const listId = required(productListFrom(await wishlistResponse.json()).id, 'wishlist id');

  const productSurfaceResponse = await Actions.readProduct(
    request,
    session.accessToken,
    variant.masterId,
  );
  expect(productSurfaceResponse.status()).toBe(200);
  const productSurface = (await productSurfaceResponse.json()) as Product;

  // Browser-only assertion: product detail is visible. API proof is the master
  // payload from the same product surface.
  expect(productSurface.id).toBe(variant.masterId);
  expect(productSurface.name).toBe(variant.productName);

  const savedResponse = await Actions.addWishlistItem(
    request,
    session.accessToken,
    session.customerId,
    listId,
    variant.masterId,
  );
  expect(savedResponse.status()).toBe(200);
  expect(productListItemFrom(await savedResponse.json()).productId).toBe(variant.masterId);

  const reopenedResponse = await Actions.readWishlist(
    request,
    session.accessToken,
    session.customerId,
    listId,
  );
  expect(reopenedResponse.status()).toBe(200);
  const reopened = productListFrom(await reopenedResponse.json());
  expect(itemFor(reopened, variant.masterId).quantity).toBe(1);

  const hydratedMasterResponse = await Actions.readProduct(
    request,
    session.accessToken,
    variant.masterId,
  );
  expect(hydratedMasterResponse.status()).toBe(200);
  const master = (await hydratedMasterResponse.json()) as Product;

  // Browser-only assertion: saved item heading is visible. Shopper Products
  // hydrates the saved master with the same catalog name.
  expect(master.name).toBe(variant.productName);

  // Browser-only assertions: View Options and options modal are visible. A
  // non-sellable master carrying colour and size attributes is the API proof
  // that options must be resolved first.
  expect(isMasterProduct(master)).toBe(true);
  expect(isVariantProduct(master)).toBe(false);
  expect(master.variationValues).toBeUndefined();
  expect(hasVariationAttribute(master, 'color')).toBe(true);
  expect(hasVariationAttribute(master, 'size')).toBe(true);

  const resolvedVariant = variantFromMaster(master, variant.variantId);
  expect(variantDisplayName(master, resolvedVariant, 'color')).toBe(variant.colorName);
  expect(variantDisplayName(master, resolvedVariant, 'size')).toBe(variant.sizeName);

  const resolvedProductResponse = await Actions.readProduct(
    request,
    session.accessToken,
    resolvedVariant.productId,
  );
  expect(resolvedProductResponse.status()).toBe(200);
  const resolvedProduct = (await resolvedProductResponse.json()) as Product;

  // Browser-only assertion: modal Add to Cart is enabled. The resolved SKU is a
  // variant whose current inventory is orderable.
  expect(resolvedVariant.orderable).toBe(true);
  expect(isVariantProduct(resolvedProduct)).toBe(true);
  expect(isOrderableProduct(resolvedProduct)).toBe(true);

  const createdBasket = await Actions.createBasket(request, session.accessToken);
  expect(createdBasket.status()).toBe(200);
  const basketId = required(((await createdBasket.json()) as Basket).basketId, 'basketId');

  const addedProduct = await Actions.addProductToBasket(
    request,
    session.accessToken,
    basketId,
    resolvedVariant.productId,
  );
  expect(addedProduct.status()).toBe(200);
  const basket = (await addedProduct.json()) as Basket;

  // Browser-only assertion: resolved item is visible after opening cart. The
  // basket line carries the exact variant resolved from the saved master.
  expect(basket.basketId).toBe(basketId);
  expect(basketLineFor(basket, resolvedVariant.productId).quantity).toBe(1);
});
