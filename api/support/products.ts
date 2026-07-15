import type { APIRequestContext } from '@playwright/test';
import { bearer, shopperApiUrl, withSite } from './scapi';

// Finds variants that can be bought right now, so tests never hardcode a variant id.
// (A "master" is the parent product; its "variants" are the buyable color/size versions.)
// Stock on the shared demo store sells out over time (our own checkout tests buy from it),
// so any fixed variant would eventually break every spec that uses it. Specs instead ask
// for "orderable variants of this master" and assert on what comes back. When the preferred
// master is completely sold out, a catalog search finds a replacement.

interface VariationAttributeValue {
  name?: string;
  value?: string;
}

interface VariationAttribute {
  id?: string;
  values?: VariationAttributeValue[];
}

interface MasterVariant {
  productId?: string;
  variationValues?: Record<string, string>;
}

interface MasterProduct {
  name?: string;
  variants?: MasterVariant[];
  variationAttributes?: VariationAttribute[];
}

interface VariantDetail {
  id?: string;
  inventory?: { orderable?: boolean; ats?: number };
}

interface ProductsResult {
  data?: VariantDetail[];
}

interface SearchResult {
  hits?: { productId?: string }[];
}

export interface OrderableVariant {
  masterId: string;
  productName: string;
  variantId: string;
  ats: number;
  colorName?: string;
  sizeName?: string;
}

// A variant a UI test can reach on the product page by clicking the first color swatch and
// then a size button. Carries the display names the page shows, so specs can click and
// assert on them.
export interface UiOrderableVariant extends OrderableVariant {
  colorName: string;
  sizeName: string;
}

// A variant with fewer units than this is too close to selling out to be safe test data:
// parallel workers and the checkout specs themselves buy stock while a run is going.
const MIN_ATS = 10;

// Catalog search used to find a replacement master once the preferred one is sold out.
const FALLBACK_SEARCH = 'shirt';
const FALLBACK_LIMIT = '24';

interface VariantEntry {
  productId: string;
  variationValues?: Record<string, string>;
}

const displayName = (
  attributes: VariationAttribute[],
  attributeId: string,
  value: string | undefined,
): string | undefined => {
  if (value === undefined) return undefined;
  const attribute = attributes.find((candidate) => candidate.id === attributeId);
  if (attribute?.values === undefined) return undefined;
  return attribute.values.find((candidate) => candidate.value === value)?.name;
};

const matchesColorFilter = (
  variationValues: Record<string, string> | undefined,
  firstColorOnly: boolean,
  firstColor: string | undefined,
): boolean => {
  if (!firstColorOnly) return true;
  if (firstColor === undefined) return true;
  if (variationValues === undefined) return false;
  return variationValues.color === firstColor;
};

const firstColorValue = (attributes: VariationAttribute[]): string | undefined => {
  const colorAttribute = attributes.find((attribute) => attribute.id === 'color');
  if (colorAttribute === undefined) return undefined;
  if (colorAttribute.values === undefined) return undefined;
  const first = colorAttribute.values[0];
  if (first === undefined) return undefined;
  return first.value;
};

const toVariantEntry = (
  variant: MasterVariant,
  firstColorOnly: boolean,
  firstColor: string | undefined,
): VariantEntry[] => {
  if (variant.productId === undefined) return [];
  if (!matchesColorFilter(variant.variationValues, firstColorOnly, firstColor)) return [];
  return [{ productId: variant.productId, variationValues: variant.variationValues }];
};

const variantEntriesOf = (master: MasterProduct, firstColorOnly: boolean): VariantEntry[] => {
  const attributes = master.variationAttributes ?? [];
  const firstColor = firstColorValue(attributes);
  const variants = master.variants ?? [];
  return variants.flatMap((variant) => toVariantEntry(variant, firstColorOnly, firstColor));
};

const stockByIdFrom = (
  details: ProductsResult,
): Map<string, VariantDetail['inventory']> => {
  const rows = details.data ?? [];
  return new Map(
    rows.flatMap((detail) => {
      if (detail.id === undefined) return [];
      return [[detail.id, detail.inventory] as const];
    }),
  );
};

const atsOf = (stock: VariantDetail['inventory'] | undefined): number => {
  if (stock === undefined) return 0;
  if (stock.ats === undefined) return 0;
  return stock.ats;
};

const isComfortablyOrderable = (stock: VariantDetail['inventory'] | undefined): boolean => {
  if (stock === undefined) return false;
  if (stock.orderable !== true) return false;
  return atsOf(stock) >= MIN_ATS;
};

const variationValue = (
  values: Record<string, string> | undefined,
  key: string,
): string | undefined => {
  if (values === undefined) return undefined;
  return values[key];
};

const toOrderable = (
  variant: VariantEntry,
  stockById: Map<string, VariantDetail['inventory']>,
  masterId: string,
  productName: string,
  attributes: VariationAttribute[],
): OrderableVariant[] => {
  const stock = stockById.get(variant.productId);
  if (!isComfortablyOrderable(stock)) return [];
  return [
    {
      masterId,
      productName,
      variantId: variant.productId,
      ats: atsOf(stock),
      colorName: displayName(attributes, 'color', variationValue(variant.variationValues, 'color')),
      sizeName: displayName(attributes, 'size', variationValue(variant.variationValues, 'size')),
    },
  ];
};

const productNameOf = (master: MasterProduct, masterId: string): string => {
  if (master.name === undefined) return masterId;
  return master.name;
};

const fetchMaster = async (
  request: APIRequestContext,
  accessToken: string,
  masterId: string,
): Promise<MasterProduct | undefined> => {
  const response = await request.get(
    shopperApiUrl('product/shopper-products/v1', `products/${encodeURIComponent(masterId)}`),
    { params: withSite({ allImages: 'false' }), headers: bearer(accessToken) },
  );
  if (!response.ok()) return undefined;
  return (await response.json()) as MasterProduct;
};

const fetchVariantDetails = async (
  request: APIRequestContext,
  accessToken: string,
  variants: VariantEntry[],
): Promise<ProductsResult | undefined> => {
  const response = await request.get(shopperApiUrl('product/shopper-products/v1', 'products'), {
    params: withSite({
      ids: variants.map((variant) => variant.productId).join(','),
      allImages: 'false',
    }),
    headers: bearer(accessToken),
  });
  if (!response.ok()) return undefined;
  return (await response.json()) as ProductsResult;
};

// All buyable variants of one master with a comfortable stock buffer, best-stocked first.
// With firstColorOnly, only variants of the first color swatch (what the UI tests click).
const orderableVariantsOf = async (
  request: APIRequestContext,
  accessToken: string,
  masterId: string,
  firstColorOnly: boolean,
): Promise<OrderableVariant[]> => {
  const master = await fetchMaster(request, accessToken, masterId);
  if (master === undefined) return [];
  const attributes = master.variationAttributes ?? [];
  const variants = variantEntriesOf(master, firstColorOnly);
  if (variants.length === 0) return [];

  const details = await fetchVariantDetails(request, accessToken, variants);
  if (details === undefined) return [];
  const stockById = stockByIdFrom(details);
  const productName = productNameOf(master, masterId);

  return variants
    .flatMap((variant) => toOrderable(variant, stockById, masterId, productName, attributes))
    .sort((a, b) => b.ats - a.ats);
};

// Master ids from a catalog search, minus duplicates and the sold-out preferred master.
const fallbackMasterIds = async (
  request: APIRequestContext,
  accessToken: string,
  excludeMasterId: string,
): Promise<string[]> => {
  const response = await request.get(shopperApiUrl('search/shopper-search/v1', 'product-search'), {
    params: withSite({ q: FALLBACK_SEARCH, limit: FALLBACK_LIMIT }),
    headers: bearer(accessToken),
  });
  if (!response.ok()) return [];
  const result = (await response.json()) as SearchResult;
  const ids = (result.hits ?? []).flatMap((hit) =>
    hit.productId !== undefined && hit.productId !== excludeMasterId ? [hit.productId] : [],
  );
  return [...new Set(ids)];
};

export interface DiscoveryOptions {
  masterId: string;
  /** How many distinct orderable variants the caller needs. */
  minCount: number;
}

// At least minCount buyable variants from a single master, best-stocked first: the preferred
// master when it has enough, otherwise the first catalog-search master that does. Throws a
// clear error rather than letting sold-out stock show up later as a confusing 400.
export const findOrderableVariants = async (
  request: APIRequestContext,
  accessToken: string,
  { masterId, minCount }: DiscoveryOptions,
): Promise<OrderableVariant[]> => {
  const preferred = await orderableVariantsOf(request, accessToken, masterId, false);
  if (preferred.length >= minCount) return preferred;
  for (const candidate of await fallbackMasterIds(request, accessToken, masterId)) {
    const variants = await orderableVariantsOf(request, accessToken, candidate, false);
    if (variants.length >= minCount) return variants;
  }
  throw new Error(
    `no product master with ${minCount} orderable variant(s) holding at least ${MIN_ATS} units was found ` +
      `(preferred master ${masterId}, fallback search "${FALLBACK_SEARCH}"); the demo store's stock has likely changed`,
  );
};

// The best-stocked variant a UI test can pick on the product page (first color swatch, then
// its size button), falling back to a catalog search like findOrderableVariants. Throws when
// no product's first color has a buyable variant.
export const findUiOrderableVariant = async (
  request: APIRequestContext,
  accessToken: string,
  masterId: string,
): Promise<UiOrderableVariant> => {
  const isUiSelectable = (variant: OrderableVariant): variant is UiOrderableVariant =>
    variant.colorName !== undefined && variant.sizeName !== undefined;
  const preferred = (await orderableVariantsOf(request, accessToken, masterId, true)).find(
    isUiSelectable,
  );
  if (preferred) return preferred;
  for (const candidate of await fallbackMasterIds(request, accessToken, masterId)) {
    const variant = (await orderableVariantsOf(request, accessToken, candidate, true)).find(
      isUiSelectable,
    );
    if (variant) return variant;
  }
  throw new Error(
    `no variant reachable from a product page's first color swatch is orderable with at least ${MIN_ATS} units ` +
      `(preferred master ${masterId}, fallback search "${FALLBACK_SEARCH}"); the demo store's stock has likely changed`,
  );
};
