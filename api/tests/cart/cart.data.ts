export interface ProductItem {
  itemId: string;
  productId: string;
  quantity: number;
  // extended price for the line (unit price times quantity)
  price?: number;
}

export interface Basket {
  basketId: string;
  productItems?: ProductItem[];
  productSubTotal?: number;
  orderTotal?: number | null;
}

export interface Fault {
  type?: string;
}

export interface AddItem {
  productId: string;
  quantity: number;
}

export interface CartFixture {
  masterId: string;
  updatedQuantity: number;
  overQuantity: number;
}

// A shirt master the spec resolves two in-stock variants of at runtime (hardcoded variants go
// stale as the shared demo store's stock drains), plus a quantity too large to ever be in stock.
export const cart: CartFixture = {
  masterId: '78916783M',
  updatedQuantity: 3,
  overQuantity: 999999,
};

// Normalized line items: an empty basket omits the array, so callers get [] instead of undefined.
export const lineItems = (basket: Basket): ProductItem[] => basket.productItems ?? [];

// The one line item a step expects to find; fails clearly if the basket is unexpectedly empty.
export const firstLineItem = (basket: Basket): ProductItem => {
  const [item] = lineItems(basket);
  if (!item) throw new Error('expected at least one product item in the basket');
  return item;
};

// Basket subtotal; the -1 fallback forces a mismatch if the field is ever absent.
export const subtotal = (basket: Basket): number => basket.productSubTotal ?? -1;

// sum of line prices, for comparing against the basket subtotal
export const lineItemsTotal = (items: ProductItem[]): number =>
  items.reduce((sum, item) => sum + (item.price ?? 0), 0);
