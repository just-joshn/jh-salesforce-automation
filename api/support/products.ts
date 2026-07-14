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

const displayName = (
  attributes: VariationAttribute[],
  attributeId: string,
  value: string | undefined,
): string | undefined => {
  if (value === undefined) return undefined;
  const values = attributes.find((attribute) => attribute.id === attributeId)?.values ?? [];
  return values.find((candidate) => candidate.value === value)?.name;
};

// All buyable variants of one master with a comfortable stock buffer, best-stocked first.
// With firstColorOnly, only variants of the first color swatch (what the UI tests click).
const orderableVariantsOf = async (
  request: APIRequestContext,
  accessToken: string,
  masterId: string,
  firstColorOnly: boolean,
): Promise<OrderableVariant[]> => {
  const masterResponse = await request.get(
    shopperApiUrl('product/shopper-products/v1', `products/${encodeURIComponent(masterId)}`),
    { params: withSite({ allImages: 'false' }), headers: bearer(accessToken) },
  );
  if (!masterResponse.ok()) return [];
  const master = (await masterResponse.json()) as MasterProduct;
  const attributes = master.variationAttributes ?? [];
  const firstColor = attributes.find((attribute) => attribute.id === 'color')?.values?.[0]?.value;

  const variants = (master.variants ?? []).flatMap((variant) =>
    variant.productId !== undefined &&
    (!firstColorOnly || firstColor === undefined || variant.variationValues?.color === firstColor)
      ? [{ productId: variant.productId, variationValues: variant.variationValues }]
      : [],
  );
  if (variants.length === 0) return [];

  const detailResponse = await request.get(
    shopperApiUrl('product/shopper-products/v1', 'products'),
    {
      params: withSite({
        ids: variants.map((variant) => variant.productId).join(','),
        allImages: 'false',
      }),
      headers: bearer(accessToken),
    },
  );
  if (!detailResponse.ok()) return [];
  const details = (await detailResponse.json()) as ProductsResult;
  const stockById = new Map(
    (details.data ?? []).flatMap((detail) =>
      detail.id !== undefined ? [[detail.id, detail.inventory] as const] : [],
    ),
  );

  return variants
    .flatMap((variant) => {
      const stock = stockById.get(variant.productId);
      const ats = stock?.ats ?? 0;
      if (stock?.orderable !== true || ats < MIN_ATS) return [];
      return [
        {
          masterId,
          productName: master.name ?? masterId,
          variantId: variant.productId,
          ats,
          colorName: displayName(attributes, 'color', variant.variationValues?.color),
          sizeName: displayName(attributes, 'size', variant.variationValues?.size),
        },
      ];
    })
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
