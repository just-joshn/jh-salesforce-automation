export interface Variant {
  productId: string;
  orderable: boolean;
  price?: number;
  variationValues?: Record<string, string>;
}

export interface Product {
  id: string;
  variants?: Variant[];
}

export interface ProductItem {
  itemId: string;
  productId: string;
  quantity: number;
  price?: number;
  shipmentId?: string;
}

export interface Basket {
  basketId: string;
  productItems?: ProductItem[];
  shipments?: { shipmentId: string }[];
}

export interface Fault {
  type?: string;
  title?: string;
}

// Variants of a master product; absent when the product has none.
export const variantsOf = (product: Product): Variant[] => product.variants ?? [];

// How many variation axes (color, size, ...) a variant resolves.
export const variationCount = (variant: Variant): number =>
  Object.keys(variant.variationValues ?? {}).length;

export const lineItems = (basket: Basket): ProductItem[] => basket.productItems ?? [];

// The one line item the add step expects; fails clearly if the basket is unexpectedly empty.
export const firstLineItem = (basket: Basket): ProductItem => {
  const [item] = lineItems(basket);
  if (!item) throw new Error('expected the added product item');
  return item;
};

export interface DeliveryFixture {
  masterId: string;
  quantity: number;
  overQuantity: number;
}

// master product with color/size variants, known to be shippable
export const deliveryProduct: DeliveryFixture = {
  masterId: '78916783M',
  quantity: 2,
  overQuantity: 999999,
};
