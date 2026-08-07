import type { APIRequestContext } from '@playwright/test';
import type { UiOrderableVariant } from '../../support/products';
import { findUiOrderableVariant } from '../../support/products';
import { customString, required } from '../../support/scapi';
import type {
  Basket,
  BasketProductItem,
  BasketShipment,
  Product,
  ProductVariant,
  ProductVariationAttribute,
} from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';

// Main product id and quantity match the browser journey. Stock is resolved at run time.
export const configuration = { masterId: '25591139M', quantity: 2 } as const;

export const orderableVariant = async (request: APIRequestContext): Promise<UiOrderableVariant> => {
  const { accessToken } = await getGuestToken(request);
  return findUiOrderableVariant(request, accessToken, configuration.masterId);
};

export const configuredProductItems = (variantId: string) => [
  { productId: variantId, quantity: configuration.quantity },
];

export const lineItems = (basket: Basket): BasketProductItem[] => basket.productItems ?? [];

export const lineFor = (basket: Basket, productId: string): BasketProductItem => {
  const line = lineItems(basket).find((candidate) => candidate.productId === productId);
  if (line === undefined) throw new Error(`the basket holds no line for product ${productId}`);
  return line;
};

export const itemCount = (basket: Basket): number =>
  lineItems(basket).reduce((sum, line) => sum + (line.quantity ?? 0), 0);

export const shipmentById = (basket: Basket, shipmentId: string): BasketShipment => {
  const shipment = (basket.shipments ?? []).find(
    (candidate) => candidate.shipmentId === shipmentId,
  );
  if (shipment === undefined) throw new Error(`the basket has no shipment ${shipmentId}`);
  return shipment;
};

export const collectionStoreId = (shipment: BasketShipment): string | undefined =>
  customString(shipment.c_fromStoreId);

export const deliveryShipmentId = 'me';

const variationAttribute = (product: Product, attributeId: string): ProductVariationAttribute => {
  const attribute = required(product.variationAttributes, 'variationAttributes').find(
    (candidate) => candidate.id === attributeId,
  );
  if (attribute === undefined) {
    throw new Error(`product ${product.id} has no ${attributeId} variation attribute`);
  }
  return attribute;
};

const variantOf = (product: Product, variantId: string): ProductVariant => {
  const variant = required(product.variants, 'variants').find(
    (candidate) => candidate.productId === variantId,
  );
  if (variant === undefined) throw new Error(`product ${product.id} has no variant ${variantId}`);
  return variant;
};

export const selectedVariationName = (
  product: Product,
  variantId: string,
  attributeId: string,
): string => {
  const variant = variantOf(product, variantId);
  const values = required(variant.variationValues, `${variantId}.${attributeId} values`);
  const selectedValue = required(values[attributeId], `${variantId}.${attributeId}`);
  const attribute = variationAttribute(product, attributeId);
  const displayValue = required(attribute.values, `${attributeId}.values`).find(
    (candidate) => candidate.value === selectedValue,
  );
  return required(displayValue?.name, `${attributeId}.${selectedValue}.name`);
};
