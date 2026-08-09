import type { APIRequestContext, APIResponse } from '@playwright/test';

import type { OrderableVariant } from '../../support/products';
import { bearer, withSite } from '../../support/scapi';
import type { Product, ProductSearchResult, ProductVariant } from '../../support/scapi-types';
import {
  emptyBasketRequest,
  storeVariantFrom,
  type AddressRequest,
  type BasketInput,
  type OrderRequest,
  type PaymentInstrumentRequest,
  type ProductItemRequest,
  type ShipmentInput,
  type ShippingMethodRequest,
} from './store-pickup.data';
import * as Endpoints from './store-pickup.endpoints';

const requestOptions = (accessToken: string) => ({
  headers: bearer(accessToken),
  params: withSite(),
});

const requireOk = async (response: APIResponse, operation: string): Promise<void> => {
  if (!response.ok()) {
    throw new Error(`${operation} failed with HTTP ${response.status()}: ${await response.text()}`);
  }
};

const readProduct = async (response: APIResponse, operation: string): Promise<Product> => {
  await requireOk(response, operation);
  return (await response.json()) as Product;
};

export const getProductAtStore = async (
  request: APIRequestContext,
  accessToken: string,
  productId: string,
  inventoryId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.product(productId), {
    headers: bearer(accessToken),
    params: withSite({ expand: 'availability,variations', inventoryIds: inventoryId }),
  });

const variantCandidate = async (
  request: APIRequestContext,
  accessToken: string,
  master: Product,
  variantId: string,
  inventoryId: string,
): Promise<OrderableVariant | undefined> => {
  const response = await getProductAtStore(request, accessToken, variantId, inventoryId);
  const stockedProduct = await readProduct(response, `SCAPI product ${variantId}`);
  return storeVariantFrom(master, stockedProduct, variantId);
};

const orderableVariants = (master: Product): readonly ProductVariant[] =>
  (master.variants ?? []).filter((variant) => variant.orderable);

const candidateFromMaster = async (
  request: APIRequestContext,
  accessToken: string,
  master: Product,
  inventoryId: string,
): Promise<OrderableVariant | undefined> => {
  for (const variant of orderableVariants(master)) {
    const candidate = await variantCandidate(
      request,
      accessToken,
      master,
      variant.productId,
      inventoryId,
    );
    if (candidate) {
      return candidate;
    }
  }

  const productId = master.id;
  return productId ? storeVariantFrom(master, master, productId) : undefined;
};

const catalogMasters = async (
  request: APIRequestContext,
  accessToken: string,
  inventoryId: string,
): Promise<readonly Product[]> => {
  const response = await request.get(Endpoints.productSearch(), {
    headers: bearer(accessToken),
    params: withSite({ limit: '24', refine: 'cgid=root' }),
  });
  await requireOk(response, 'SCAPI product search');
  const result = (await response.json()) as ProductSearchResult;
  const masters: Product[] = [];
  for (const hit of result.hits ?? []) {
    const productResponse = await getProductAtStore(
      request,
      accessToken,
      hit.productId,
      inventoryId,
    );
    masters.push(await readProduct(productResponse, `SCAPI product ${hit.productId}`));
  }
  return masters;
};

export const findStoreAvailableVariant = async (
  request: APIRequestContext,
  accessToken: string,
  preferred: OrderableVariant,
  inventoryId: string,
): Promise<OrderableVariant> => {
  const preferredResponse = await getProductAtStore(
    request,
    accessToken,
    preferred.productId,
    inventoryId,
  );
  const preferredMaster = await readProduct(
    preferredResponse,
    `SCAPI product ${preferred.productId}`,
  );
  const preferredCandidate = await variantCandidate(
    request,
    accessToken,
    preferredMaster,
    preferred.variantId,
    inventoryId,
  );
  if (preferredCandidate) {
    return preferredCandidate;
  }

  for (const master of await catalogMasters(request, accessToken, inventoryId)) {
    const candidate = await candidateFromMaster(request, accessToken, master, inventoryId);
    if (candidate) {
      return candidate;
    }
  }
  throw new Error('No store-orderable product was found in the current catalog sample');
};

export const createBasket = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.post(Endpoints.baskets(), {
    ...requestOptions(accessToken),
    data: emptyBasketRequest,
  });

export const addPickupItem = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketInput<readonly ProductItemRequest[]>,
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(input.basketId), {
    ...requestOptions(accessToken),
    data: input.body,
  });

export const provideContact = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketInput<Readonly<{ email: string }>>,
): Promise<APIResponse> =>
  request.put(Endpoints.basketCustomer(input.basketId), {
    ...requestOptions(accessToken),
    data: input.body,
  });

export const providePickupAddress = async (
  request: APIRequestContext,
  accessToken: string,
  input: ShipmentInput<AddressRequest>,
): Promise<APIResponse> =>
  request.put(Endpoints.shipmentAddress(input.basketId, input.shipmentId), {
    ...requestOptions(accessToken),
    data: input.body,
  });

export const provideBillingAddress = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketInput<AddressRequest>,
): Promise<APIResponse> =>
  request.put(Endpoints.basketBillingAddress(input.basketId), {
    ...requestOptions(accessToken),
    data: input.body,
  });

export const getShippingMethods = async (
  request: APIRequestContext,
  accessToken: string,
  input: Omit<ShipmentInput<never>, 'body'>,
): Promise<APIResponse> =>
  request.get(Endpoints.shipmentMethods(input.basketId, input.shipmentId), {
    ...requestOptions(accessToken),
  });

export const selectShippingMethod = async (
  request: APIRequestContext,
  accessToken: string,
  input: ShipmentInput<ShippingMethodRequest>,
): Promise<APIResponse> =>
  request.put(Endpoints.shipmentMethod(input.basketId, input.shipmentId), {
    ...requestOptions(accessToken),
    data: input.body,
  });

export const providePayment = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketInput<PaymentInstrumentRequest>,
): Promise<APIResponse> =>
  request.post(Endpoints.basketPaymentInstruments(input.basketId), {
    ...requestOptions(accessToken),
    data: input.body,
  });

export const createOrder = async (
  request: APIRequestContext,
  accessToken: string,
  body: OrderRequest,
): Promise<APIResponse> =>
  request.post(Endpoints.orders(), {
    ...requestOptions(accessToken),
    data: body,
  });
