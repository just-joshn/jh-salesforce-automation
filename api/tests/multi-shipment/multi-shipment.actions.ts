import type { APIRequestContext, APIResponse } from '@playwright/test';

import type { OrderableVariant } from '../../support/products';
import { bearer, withSite } from '../../support/scapi';
import type {
  Product,
  ProductSearchHit,
  ProductSearchResult,
  ProductVariant,
} from '../../support/scapi-types';
import {
  emptyBasketRequest,
  orderableVariantFrom,
  type AddressRequest,
  type BasketInput,
  type OrderRequest,
  type PaymentInstrumentRequest,
  type ProductItemRequest,
  type ShipmentInput,
  type ShipmentRequest,
  type ShippingMethodRequest,
} from './multi-shipment.data';
import * as Endpoints from './multi-shipment.endpoints';

const requestOptions = (accessToken: string) => ({
  headers: bearer(accessToken),
  params: withSite(),
});

const requireOk = async (response: APIResponse, operation: string): Promise<void> => {
  if (!response.ok()) {
    throw new Error(`${operation} failed with HTTP ${response.status()}: ${await response.text()}`);
  }
};

const fetchProduct = async (
  request: APIRequestContext,
  accessToken: string,
  productId: string,
): Promise<Product> => {
  const response = await request.get(Endpoints.product(productId), {
    headers: bearer(accessToken),
    params: withSite({ expand: 'availability,variations' }),
  });
  await requireOk(response, `SCAPI product ${productId}`);
  return (await response.json()) as Product;
};

const standaloneCandidate = (master: Product): OrderableVariant | undefined => {
  const masterId = master.id;
  return masterId ? orderableVariantFrom(master, master, masterId) : undefined;
};

const orderableVariants = (master: Product): readonly ProductVariant[] =>
  (master.variants ?? []).filter((variant) => variant.orderable);

const variantCandidateFromMaster = async (
  request: APIRequestContext,
  accessToken: string,
  master: Product,
): Promise<OrderableVariant | undefined> => {
  for (const variant of orderableVariants(master)) {
    const stockedProduct = await fetchProduct(request, accessToken, variant.productId);
    const candidate = orderableVariantFrom(master, stockedProduct, variant.productId);
    if (candidate) {
      return candidate;
    }
  }
  return undefined;
};

const candidateFromMaster = async (
  request: APIRequestContext,
  accessToken: string,
  master: Product,
): Promise<OrderableVariant | undefined> =>
  standaloneCandidate(master) ?? variantCandidateFromMaster(request, accessToken, master);

const distinctHits = (
  result: ProductSearchResult,
  excludedProductId: string,
): readonly ProductSearchHit[] =>
  (result.hits ?? []).filter((hit) => hit.productId !== excludedProductId);

export const findDistinctOrderableVariant = async (
  request: APIRequestContext,
  accessToken: string,
  excludedProductId: string,
): Promise<OrderableVariant> => {
  const response = await request.get(Endpoints.productSearch(), {
    headers: bearer(accessToken),
    params: withSite({ limit: '24', refine: 'cgid=root' }),
  });
  await requireOk(response, 'SCAPI product search');
  const result = (await response.json()) as ProductSearchResult;
  for (const hit of distinctHits(result, excludedProductId)) {
    const master = await fetchProduct(request, accessToken, hit.productId);
    const candidate = await candidateFromMaster(request, accessToken, master);
    if (candidate) {
      return candidate;
    }
  }
  throw new Error('No second distinct orderable product was found in the current catalog sample');
};

export const createBasket = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.post(Endpoints.baskets(), {
    ...requestOptions(accessToken),
    data: emptyBasketRequest,
  });

export const createShipment = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketInput<ShipmentRequest>,
): Promise<APIResponse> =>
  request.post(Endpoints.basketShipments(input.basketId), {
    ...requestOptions(accessToken),
    data: input.body,
  });

export const addProductToShipment = async (
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

export const provideShippingAddress = async (
  request: APIRequestContext,
  accessToken: string,
  input: ShipmentInput<AddressRequest>,
): Promise<APIResponse> =>
  request.put(Endpoints.shipmentAddress(input.basketId, input.shipmentId), {
    ...requestOptions(accessToken),
    data: input.body,
    params: withSite({ useAsBilling: 'true' }),
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
