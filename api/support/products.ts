import type { APIRequestContext } from '@playwright/test';
import { bearer, shopperApiUrl, withSite } from './scapi';

// Runtime discovery of purchasable variants, so tests never pin a hardcoded variant id.
// The shared demo store's stock drains over time (our own checkout tests consume it), so any
// fixed variant eventually sells out and every spec that references it starts failing. Specs
// instead ask for "orderable variants of this master" and assert on what comes back; when the
// preferred master runs dry entirely, a catalog search hunts for a replacement master.

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

// A variant the PDP reaches by clicking the first colour swatch and then a size button, with the
// display names the UI renders (so specs can click and assert on them).
export interface UiOrderableVariant extends OrderableVariant {
  colorName: string;
  sizeName: string;
}

// Below this many units a variant is too close to selling out to be safe test data: parallel
// workers and the checkout specs themselves consume stock while a run is in flight.
const MIN_ATS = 10;

// Catalog search used to find a replacement master once the preferred one has no stock left.
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

// All variants of one master that are orderable with a comfortable stock buffer, best-stocked
// first. With firstColorOnly, only variants of the first colour swatch (what the UI tests click).
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

// Master ids from a catalog search, deduplicated, the preferred (dry) master excluded.
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

// At least minCount orderable variants from one master, best-stocked first: the preferred master
// when it can satisfy the request, otherwise the first catalog-search master that can. Throws a
// clear error instead of letting stale stock surface later as an opaque 400.
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

// The best-stocked variant a UI test can select on the PDP (first colour swatch, then its size
// button), falling back to a catalog search like findOrderableVariants. Throws when nothing on
// the PDP's first colour is orderable anywhere.
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
    `no variant reachable from a PDP's first colour swatch is orderable with at least ${MIN_ATS} units ` +
      `(preferred master ${masterId}, fallback search "${FALLBACK_SEARCH}"); the demo store's stock has likely changed`,
  );
};
