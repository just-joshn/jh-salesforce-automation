import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, required, shopperApiUrl, withSite } from './scapi';
import type {
  Product,
  ProductInventory,
  ProductSearchHit,
  ProductSearchResult,
  ProductVariant,
  ProductVariationAttribute,
} from './scapi-types';

// Shared demo journeys place real orders concurrently; leave ten units beyond each selected SKU.
export const MINIMUM_AVAILABLE_TO_SELL = 10;

const CATALOG_PAGE_SIZE = 24;

const WHOLE_CATALOG_REFINEMENT = 'cgid=root';

const PRODUCT_EXPANSIONS = 'availability,variations';

export interface OrderableVariant {
  readonly availableToSell: number;
  readonly productId: string;
  readonly productName: string;
  readonly variantId: string;
}

export interface OrderableVariantWithVariationValues extends OrderableVariant {
  readonly colourName: string | undefined;
  readonly sizeName: string | undefined;
  readonly variationValues: Readonly<Record<string, string>>;
}

const productUrl = (productId: string): string =>
  shopperApiUrl('product/shopper-products', `products/${encodeURIComponent(productId)}`);

const searchUrl = (): string => shopperApiUrl('search/shopper-search', 'product-search');

const requireSuccessfulResponse = async (
  response: APIResponse,
  operation: string,
): Promise<void> => {
  if (response.status() !== 200) {
    throw new Error(`${operation} failed with HTTP ${response.status()}: ${await response.text()}`);
  }
};

const searchCatalog = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<readonly ProductSearchHit[]> => {
  const response = await request.get(searchUrl(), {
    headers: bearer(accessToken),
    params: withSite({
      limit: String(CATALOG_PAGE_SIZE),
      refine: WHOLE_CATALOG_REFINEMENT,
    }),
  });
  await requireSuccessfulResponse(response, 'SCAPI product search');
  const payload = (await response.json()) as ProductSearchResult;
  return payload.hits ?? [];
};

const fetchProduct = async (
  request: APIRequestContext,
  accessToken: string,
  productId: string,
  inventoryId: string | undefined,
): Promise<Product> => {
  const params = inventoryId
    ? withSite({ expand: PRODUCT_EXPANSIONS, inventoryIds: inventoryId })
    : withSite({ expand: PRODUCT_EXPANSIONS });
  const response = await request.get(productUrl(productId), {
    headers: bearer(accessToken),
    params,
  });
  await requireSuccessfulResponse(response, `SCAPI product ${productId}`);
  return (await response.json()) as Product;
};

const hasMinimumStock = (ats: number | undefined): ats is number =>
  ats !== undefined && ats >= MINIMUM_AVAILABLE_TO_SELL;

const availableToSell = (inventory: ProductInventory | undefined): number | undefined => {
  const ats = inventory?.ats;
  return inventory?.orderable && hasMinimumStock(ats) ? ats : undefined;
};

const findVariant = (product: Product, variantId: string): ProductVariant | undefined =>
  product.variants?.find((variant) => variant.productId === variantId);

const toOrderableVariant = (
  product: Product,
  variant: ProductVariant,
  inventory: ProductInventory | undefined,
): OrderableVariant | undefined => {
  const ats = availableToSell(inventory);
  if (!variant.orderable || ats === undefined) {
    return undefined;
  }

  return {
    availableToSell: ats,
    productId: required(product.id, 'product.id'),
    productName: required(product.name, 'product.name'),
    variantId: variant.productId,
  };
};

const inventoryFor = (
  product: Product,
  inventoryId: string | undefined,
): ProductInventory | undefined => (inventoryId ? product.inventories?.[0] : product.inventory);

const findOrderableVariantFromVariants = async (
  request: APIRequestContext,
  accessToken: string,
  master: Product,
  inventoryId: string | undefined,
): Promise<OrderableVariant | undefined> => {
  for (const variant of master.variants ?? []) {
    const candidate = await findVariantCandidate(
      request,
      accessToken,
      master,
      variant,
      inventoryId,
    );
    if (candidate) {
      return candidate;
    }
  }

  return undefined;
};

const findVariantCandidate = async (
  request: APIRequestContext,
  accessToken: string,
  master: Product,
  variant: ProductVariant,
  inventoryId: string | undefined,
): Promise<OrderableVariant | undefined> => {
  if (!variant.orderable) {
    return undefined;
  }

  const resolvedVariant = await fetchProduct(request, accessToken, variant.productId, inventoryId);
  return toOrderableVariant(master, variant, inventoryFor(resolvedVariant, inventoryId));
};

const productItself = (product: Product): ProductVariant => ({
  orderable: product.inventory?.orderable ?? false,
  productId: product.id,
});

interface ProductCandidate {
  readonly candidate: OrderableVariant;
  readonly master: Product;
}

// Bundles and sets render "Add Bundle to Cart" / "Add Set to Cart", so a journey resolving one fails
// on the standard affordance for reasons unrelated to itself. Live-verified: womens-jewelry-bundleM.
const isStandaloneProduct = (product: Product): boolean =>
  product.type?.bundle !== true && product.type?.set !== true;

const findOrderableVariantInProduct = async (
  request: APIRequestContext,
  accessToken: string,
  productId: string,
  inventoryId: string | undefined,
): Promise<ProductCandidate | undefined> => {
  const master = await fetchProduct(request, accessToken, productId, inventoryId);
  if (!isStandaloneProduct(master)) {
    return undefined;
  }

  const variantCandidate = await findOrderableVariantFromVariants(
    request,
    accessToken,
    master,
    inventoryId,
  );
  const candidate =
    variantCandidate ??
    toOrderableVariant(master, productItself(master), inventoryFor(master, inventoryId));
  return candidate ? { candidate, master } : undefined;
};

const hasVariationAttributes = ({ master }: ProductCandidate): boolean =>
  (master.variationAttributes?.length ?? 0) > 0;

const collectCandidates = async (
  request: APIRequestContext,
  accessToken: string,
  inventoryId: string | undefined,
): Promise<ProductCandidate[]> => {
  const hits = await searchCatalog(request, accessToken);
  const found: ProductCandidate[] = [];
  for (const hit of hits) {
    const candidate = await findOrderableVariantInProduct(
      request,
      accessToken,
      hit.productId,
      inventoryId,
    );
    if (candidate) {
      found.push(candidate);
    }
  }

  return found;
};

const requireCandidate = (candidate: ProductCandidate | undefined): ProductCandidate => {
  if (!candidate) {
    throw new Error(`No orderable variant with ATS >= ${MINIMUM_AVAILABLE_TO_SELL} was found`);
  }

  return candidate;
};

const findCandidate = async (
  request: APIRequestContext,
  accessToken: string,
  inventoryId: string | undefined,
): Promise<ProductCandidate> => {
  const found = await collectCandidates(request, accessToken, inventoryId);
  return requireCandidate(found[0]);
};

const findConfigurableCandidate = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<ProductCandidate> => {
  const found = await collectCandidates(request, accessToken, undefined);
  return requireCandidate(found.find(hasVariationAttributes) ?? found[0]);
};

const visibleValue = (
  attributes: readonly ProductVariationAttribute[] | undefined,
  variationValues: Readonly<Record<string, string>>,
  attributeMatcher: RegExp,
): string | undefined => {
  const attribute = attributes?.find((item) => attributeMatcher.test(item.id));
  return attribute ? matchingVisibleValue(attribute, variationValues) : undefined;
};

const matchingVisibleValue = (
  attribute: ProductVariationAttribute,
  variationValues: Readonly<Record<string, string>>,
): string | undefined => {
  const value = variationValues[attribute.id];
  return attribute.values?.find((item) => item.value === value)?.name;
};

export const findOrderableVariant = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<OrderableVariant> => (await findCandidate(request, accessToken, undefined)).candidate;

export const findOrderableVariantWithVariationValues = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<OrderableVariantWithVariationValues> => {
  const { candidate, master } = await findConfigurableCandidate(request, accessToken);
  const variationValues = findVariant(master, candidate.variantId)?.variationValues ?? {};
  return {
    ...candidate,
    colourName: visibleValue(master.variationAttributes, variationValues, /colou?r/i),
    sizeName: visibleValue(master.variationAttributes, variationValues, /size/i),
    variationValues,
  };
};
