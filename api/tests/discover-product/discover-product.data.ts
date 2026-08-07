import type { APIRequestContext } from '@playwright/test';
import type { PromotedUiVariant } from '../../support/products';
import { findPromotedUiVariant } from '../../support/products';
import { required } from '../../support/scapi';
import type {
  Product,
  ProductSearchHit,
  ProductSearchResult,
  ProductVariant,
  ProductVariationAttribute,
} from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';

// Search word with plenty of hits, some of them on promotion.
export const discoveryQuery = { term: 'shirt' } as const;

// Search picks the product. Product calls supply its promoted, selectable variant.
export const promotedProduct = async (request: APIRequestContext): Promise<PromotedUiVariant> => {
  const { accessToken } = await getGuestToken(request);
  return findPromotedUiVariant(request, accessToken, discoveryQuery.term);
};

export const searchHits = (result: ProductSearchResult): ProductSearchHit[] => result.hits;

export const promotionCallouts = (product: Product): string[] =>
  (product.productPromotions ?? []).flatMap((promotion) =>
    promotion.calloutMsg === undefined ? [] : [promotion.calloutMsg],
  );

export const variationAttribute = (
  product: Product,
  attributeId: string,
): ProductVariationAttribute => {
  const attribute = required(product.variationAttributes, 'variationAttributes').find(
    (candidate) => candidate.id === attributeId,
  );
  if (attribute === undefined) {
    throw new Error(`product ${product.id} has no ${attributeId} variation attribute`);
  }
  return attribute;
};

export const variantOf = (product: Product, variantId: string): ProductVariant => {
  const variant = required(product.variants, 'variants').find(
    (candidate) => candidate.productId === variantId,
  );
  if (variant === undefined) throw new Error(`product ${product.id} has no variant ${variantId}`);
  return variant;
};

export const variationDisplayName = (
  product: Product,
  variant: ProductVariant,
  attributeId: string,
): string => {
  const values = required(variant.variationValues, `${variant.productId}.${attributeId} values`);
  const selectedValue = required(values[attributeId], `${variant.productId}.${attributeId}`);
  const attribute = variationAttribute(product, attributeId);
  const displayValue = required(attribute.values, `${attributeId}.values`).find(
    (candidate) => candidate.value === selectedValue,
  );
  return required(displayValue?.name, `${attributeId}.${selectedValue}.name`);
};
