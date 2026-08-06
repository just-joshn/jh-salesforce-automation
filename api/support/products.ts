import { bearer, shopperApiUrl, withSite } from './scapi';
import type {
  Product,
  ProductInventory,
  ProductResult,
  ProductSearchResult,
  ProductVariant,
  ProductVariationAttribute,
} from './scapi-types';
import type { APIRequestContext } from '@playwright/test';

// Find products still in stock. Sizes are never hardcoded, because stock runs out.
// "Master" = parent product. "Variant" = one color/size you can buy.
// Both are the spec's Product; SCAPI does not split them.

export interface OrderableVariant {
  masterId: string;
  productName: string;
  variantId: string;
  ats: number;
  colorName?: string;
  sizeName?: string;
}

// UI pick: first color + a size, with names the page shows.
export interface UiOrderableVariant extends OrderableVariant {
  colorName: string;
  sizeName: string;
}

// Need this many left in stock so parallel tests don't empty it.
const MIN_ATS = 10;

// Backup search if the main product is sold out.
// API: wide search. UI: safer products (some pages crash).
const API_FALLBACK_SEARCH = 'shirt';
const UI_FALLBACK_SEARCH = 'paisley';
const FALLBACK_LIMIT = '24';

// Prefer S/M/L on the UI over odd sizes like 15R.
const PREFERRED_UI_SIZES = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL']);

interface VariantEntry {
  productId: string;
  variationValues?: Record<string, string>;
}

const displayName = (
  attributes: ProductVariationAttribute[],
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

const firstColorValue = (attributes: ProductVariationAttribute[]): string | undefined => {
  const colorAttribute = attributes.find((attribute) => attribute.id === 'color');
  if (colorAttribute === undefined) return undefined;
  if (colorAttribute.values === undefined) return undefined;
  const first = colorAttribute.values[0];
  if (first === undefined) return undefined;
  return first.value;
};

const toVariantEntry = (
  variant: ProductVariant,
  firstColorOnly: boolean,
  firstColor: string | undefined,
): VariantEntry[] => {
  if (variant.productId === undefined) return [];
  if (!matchesColorFilter(variant.variationValues, firstColorOnly, firstColor)) return [];
  return [{ productId: variant.productId, variationValues: variant.variationValues }];
};

const variantEntriesOf = (master: Product, firstColorOnly: boolean): VariantEntry[] => {
  const attributes = master.variationAttributes ?? [];
  const firstColor = firstColorValue(attributes);
  const variants = master.variants ?? [];
  return variants.flatMap((variant) => toVariantEntry(variant, firstColorOnly, firstColor));
};

const stockByIdFrom = (details: ProductResult): Map<string, Product['inventory']> => {
  const rows = details.data ?? [];
  return new Map(
    rows.flatMap((detail) => {
      if (detail.id === undefined) return [];
      return [[detail.id, detail.inventory] as const];
    }),
  );
};

const atsOf = (stock: Product['inventory'] | undefined): number => {
  if (stock === undefined) return 0;
  if (stock.ats === undefined) return 0;
  return stock.ats;
};

const isComfortablyOrderable = (stock: Product['inventory'] | undefined): boolean => {
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
  stockById: Map<string, Product['inventory']>,
  masterId: string,
  productName: string,
  attributes: ProductVariationAttribute[],
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

const productNameOf = (master: Product, masterId: string): string => {
  if (master.name === undefined) return masterId;
  return master.name;
};

const fetchMaster = async (
  request: APIRequestContext,
  accessToken: string,
  masterId: string,
): Promise<Product | undefined> => {
  const response = await request.get(
    shopperApiUrl('product/shopper-products/v1', `products/${encodeURIComponent(masterId)}`),
    { params: withSite({ allImages: 'false' }), headers: bearer(accessToken) },
  );
  if (!response.ok()) return undefined;
  return (await response.json()) as Product;
};

const fetchVariantDetails = async (
  request: APIRequestContext,
  accessToken: string,
  variants: VariantEntry[],
  inventoryId?: string,
): Promise<ProductResult | undefined> => {
  const response = await request.get(shopperApiUrl('product/shopper-products/v1', 'products'), {
    params: withSite({
      ids: variants.map((variant) => variant.productId).join(','),
      allImages: 'false',
      ...(inventoryId === undefined ? {} : { inventoryIds: inventoryId }),
    }),
    headers: bearer(accessToken),
  });
  if (!response.ok()) return undefined;
  return (await response.json()) as ProductResult;
};

// In-stock variants for one product, most stock first.
// firstColorOnly = only the first color (what UI clicks).
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

// Other product ids from search (skip the one we already tried).
const fallbackMasterIds = async (
  request: APIRequestContext,
  accessToken: string,
  excludeMasterId: string,
  search: string,
): Promise<string[]> => {
  const response = await request.get(shopperApiUrl('search/shopper-search/v1', 'product-search'), {
    params: withSite({ q: search, limit: FALLBACK_LIMIT }),
    headers: bearer(accessToken),
  });
  if (!response.ok()) return [];
  const result = (await response.json()) as ProductSearchResult;
  const ids = (result.hits ?? []).flatMap((hit) =>
    hit.productId !== undefined && hit.productId !== excludeMasterId ? [hit.productId] : [],
  );
  return [...new Set(ids)];
};

export interface DiscoveryOptions {
  masterId: string;
  /** How many in-stock sizes/colors we need. */
  minCount: number;
}

// Get minCount in-stock variants. Try main product, then search. Fail clear if none.
export const findOrderableVariants = async (
  request: APIRequestContext,
  accessToken: string,
  { masterId, minCount }: DiscoveryOptions,
): Promise<OrderableVariant[]> => {
  const preferred = await orderableVariantsOf(request, accessToken, masterId, false);
  if (preferred.length >= minCount) return preferred;
  const candidates = await fallbackMasterIds(request, accessToken, masterId, API_FALLBACK_SEARCH);
  for (const candidate of candidates) {
    const variants = await orderableVariantsOf(request, accessToken, candidate, false);
    if (variants.length >= minCount) return variants;
  }
  throw new Error(
    `no product master with ${minCount} orderable variant(s) holding at least ${MIN_ATS} units was found ` +
      `(preferred master ${masterId}, fallback search "${API_FALLBACK_SEARCH}"); the demo store's stock has likely changed`,
  );
};

const isUiSelectable = (variant: OrderableVariant): variant is UiOrderableVariant =>
  variant.colorName !== undefined && variant.sizeName !== undefined;

const isPreferredUiSize = (variant: UiOrderableVariant): boolean =>
  PREFERRED_UI_SIZES.has(variant.sizeName.toUpperCase());

// Prefer S/M/L; else take the one with most stock.
const pickUiVariant = (variants: OrderableVariant[]): UiOrderableVariant | undefined => {
  const selectable = variants.filter(isUiSelectable);
  return selectable.find(isPreferredUiSize) ?? selectable[0];
};

const uiVariantOf = async (
  request: APIRequestContext,
  accessToken: string,
  masterId: string,
): Promise<UiOrderableVariant | undefined> =>
  pickUiVariant(await orderableVariantsOf(request, accessToken, masterId, true));

// Search backup products for UI: S/M/L first, else any size.
const fallbackUiVariant = async (
  request: APIRequestContext,
  accessToken: string,
  excludeMasterId: string,
): Promise<UiOrderableVariant | undefined> => {
  let anySized: UiOrderableVariant | undefined;
  const candidates = await fallbackMasterIds(
    request,
    accessToken,
    excludeMasterId,
    UI_FALLBACK_SEARCH,
  );
  for (const candidate of candidates) {
    const variant = await uiVariantOf(request, accessToken, candidate);
    if (!variant) continue;
    if (isPreferredUiSize(variant)) return variant;
    anySized ??= variant;
  }
  return anySized;
};

// The variant a product page's first color swatch can add for this exact
// product. Unlike findUiOrderableVariant, it never substitutes another product.
// Use it when the product itself is what the test is about.
export const findUiVariantOnMaster = async (
  request: APIRequestContext,
  accessToken: string,
  masterId: string,
): Promise<UiOrderableVariant | undefined> => uiVariantOf(request, accessToken, masterId);

// Best UI product: S/M/L on main product, else search, else any size.
export const findUiOrderableVariant = async (
  request: APIRequestContext,
  accessToken: string,
  masterId: string,
): Promise<UiOrderableVariant> => {
  const preferred = await uiVariantOf(request, accessToken, masterId);
  if (preferred && isPreferredUiSize(preferred)) return preferred;

  const fallback = await fallbackUiVariant(request, accessToken, masterId);
  if (fallback) return fallback;
  if (preferred) return preferred;

  throw new Error(
    `no variant reachable from a product page's first color swatch is orderable with at least ${MIN_ATS} units ` +
      `(preferred master ${masterId}, fallback search "${UI_FALLBACK_SEARCH}"); the demo store's stock has likely changed`,
  );
};

// A products call takes at most 24 ids.
const MAX_IDS = 24;
const PROMO_SEARCH_LIMIT = '25';

// A product the shop advertises, plus the size the product page can add to a cart.
export interface PromotedUiVariant extends UiOrderableVariant {
  calloutMessages: string[];
}

const searchMasterIds = async (
  request: APIRequestContext,
  accessToken: string,
  searchTerm: string,
): Promise<string[]> => {
  const response = await request.get(shopperApiUrl('search/shopper-search/v1', 'product-search'), {
    params: withSite({ q: searchTerm, limit: PROMO_SEARCH_LIMIT }),
    headers: bearer(accessToken),
  });
  if (!response.ok()) return [];
  const result = (await response.json()) as ProductSearchResult;
  const ids = (result.hits ?? []).flatMap((hit) =>
    hit.productId === undefined ? [] : [hit.productId],
  );
  return [...new Set(ids)].slice(0, MAX_IDS);
};

// Callout text comes back only when the call asks for the promotions expansion.
const fetchPromotedMasters = async (
  request: APIRequestContext,
  accessToken: string,
  ids: string[],
): Promise<Product[]> => {
  if (ids.length === 0) return [];
  const response = await request.get(shopperApiUrl('product/shopper-products/v1', 'products'), {
    params: withSite({
      ids: ids.join(','),
      allImages: 'false',
      expand: 'promotions,availability,variations',
    }),
    headers: bearer(accessToken),
  });
  if (!response.ok()) return [];
  const result = (await response.json()) as ProductResult;
  return result.data ?? [];
};

const calloutsOf = (master: Product): string[] =>
  (master.productPromotions ?? []).flatMap((promotion) =>
    promotion.calloutMsg === undefined ? [] : [promotion.calloutMsg],
  );

// First search hit that both advertises a promotion and can be bought from the page.
export const findPromotedUiVariant = async (
  request: APIRequestContext,
  accessToken: string,
  searchTerm: string,
): Promise<PromotedUiVariant> => {
  const hitIds = await searchMasterIds(request, accessToken, searchTerm);
  const masters = await fetchPromotedMasters(request, accessToken, hitIds);

  for (const master of masters) {
    const calloutMessages = calloutsOf(master);
    if (master.id === undefined || calloutMessages.length === 0) continue;
    const variant = await uiVariantOf(request, accessToken, master.id);
    if (variant) return { ...variant, calloutMessages };
  }

  throw new Error(
    `search "${searchTerm}" returned no promoted product with a variant holding at least ${MIN_ATS} units ` +
      `(searched ${hitIds.length} hit(s)); the demo store's catalog or promotions have likely changed`,
  );
};

export interface StoreCategoryProducts {
  total: number;
  masterIds: string[];
}

// Category products a single store has on the shelf. `ilids` is the same
// in-store-inventory refinement the product list page sends for its store filter.
export const findCategoryProductsInStore = async (
  request: APIRequestContext,
  accessToken: string,
  categoryId: string,
  inventoryId: string,
  limit: number,
): Promise<StoreCategoryProducts> => {
  const url = new URL(shopperApiUrl('search/shopper-search/v1', 'product-search'));
  for (const [key, value] of Object.entries(withSite({ limit: String(limit) }))) {
    url.searchParams.set(key, value);
  }
  url.searchParams.append('refine', `cgid=${categoryId}`);
  url.searchParams.append('refine', `ilids=${inventoryId}`);

  const response = await request.get(url.toString(), { headers: bearer(accessToken) });
  if (!response.ok()) {
    throw new Error(
      `category ${categoryId} search in store inventory ${inventoryId} failed with ${response.status()}`,
    );
  }

  const result = (await response.json()) as ProductSearchResult;
  const masterIds = (result.hits ?? []).flatMap((hit) =>
    hit.productId === undefined ? [] : [hit.productId],
  );
  return { total: result.total ?? masterIds.length, masterIds };
};

// One buyable choice at a store. Size is absent for products sold in one size.
export interface StoreVariant {
  masterId: string;
  productName: string;
  variantId: string;
  colorName: string;
  sizeName?: string;
  ats: number;
}

const storeStockOf = (detail: Product, inventoryId: string): ProductInventory | undefined =>
  (detail.inventories ?? []).find((entry) => entry.id === inventoryId);

const toStoreVariant = (
  variant: VariantEntry,
  stock: ProductInventory | undefined,
  masterId: string,
  productName: string,
  attributes: ProductVariationAttribute[],
): StoreVariant[] => {
  if (stock?.orderable !== true) return [];
  const colorName = displayName(
    attributes,
    'color',
    variationValue(variant.variationValues, 'color'),
  );
  if (colorName === undefined) return [];
  return [
    {
      masterId,
      productName,
      variantId: variant.productId,
      colorName,
      sizeName: displayName(attributes, 'size', variationValue(variant.variationValues, 'size')),
      ats: atsOf(stock),
    },
  ];
};

const storeStockById = (
  details: ProductResult,
  inventoryId: string,
): Map<string, ProductInventory | undefined> =>
  new Map(
    (details.data ?? []).flatMap((detail) =>
      detail.id === undefined ? [] : [[detail.id, storeStockOf(detail, inventoryId)] as const],
    ),
  );

const storeVariantsOf = async (
  request: APIRequestContext,
  accessToken: string,
  masterId: string,
  inventoryId: string,
): Promise<StoreVariant[]> => {
  const master = await fetchMaster(request, accessToken, masterId);
  if (master === undefined) return [];
  const attributes = master.variationAttributes ?? [];
  const variants = variantEntriesOf(master, false).slice(0, MAX_IDS);
  if (variants.length === 0) return [];

  const details = await fetchVariantDetails(request, accessToken, variants, inventoryId);
  if (details === undefined) return [];
  const stockById = storeStockById(details, inventoryId);
  const productName = productNameOf(master, masterId);

  return variants
    .flatMap((variant) =>
      toStoreVariant(variant, stockById.get(variant.productId), masterId, productName, attributes),
    )
    .sort((a, b) => b.ats - a.ats);
};

const firstStoreVariantOf = async (
  request: APIRequestContext,
  accessToken: string,
  masterId: string,
  inventoryId: string,
): Promise<StoreVariant | undefined> => {
  const [best] = await storeVariantsOf(request, accessToken, masterId, inventoryId);
  return best;
};

// Best-stocked choice any of these products has on the shelf at that store.
export const findStoreOrderableVariant = async (
  request: APIRequestContext,
  accessToken: string,
  masterIds: string[],
  inventoryId: string,
): Promise<StoreVariant> => {
  for (const masterId of masterIds) {
    const best = await firstStoreVariantOf(request, accessToken, masterId, inventoryId);
    if (best) return best;
  }
  throw new Error(
    `none of the ${masterIds.length} product(s) offered by store inventory ${inventoryId} has a variant ` +
      `on the shelf; the demo store's store stock has likely changed`,
  );
};
