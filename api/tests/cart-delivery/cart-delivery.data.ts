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

// Color/size list; missing if none.
export const variantsOf = (product: Product): Variant[] => product.variants ?? [];

// First size that can be bought, or fail clear.
export const firstOrderableVariant = (product: Product): Variant => {
  const variant = variantsOf(product).find((candidate) => candidate.orderable);
  if (!variant) throw new Error('expected an orderable variant');
  return variant;
};

// How many options (color, size, …) are set.
export const variationCount = (variant: Variant): number =>
  Object.keys(variant.variationValues ?? {}).length;

export const lineItems = (basket: Basket): ProductItem[] => basket.productItems ?? [];

// First cart line, or fail clear.
export const firstLineItem = (basket: Basket): ProductItem => {
  const [item] = lineItems(basket);
  if (!item) throw new Error('expected the added product item');
  return item;
};

export interface DeliveryFixture {
  masterId: string;
  quantity: number;
  overQuantity: number;
  defaultShipmentId: string;
}

// Product that can ship. "me" is the shipment a new basket ships from by default.
export const deliveryProduct: DeliveryFixture = {
  masterId: '25591139M',
  quantity: 2,
  overQuantity: 999999,
  defaultShipmentId: 'me',
};

// Ordering more units than exist fails with this fault.
export const unavailableFaultType = 'product-item-not-available';
