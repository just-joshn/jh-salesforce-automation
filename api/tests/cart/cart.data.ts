export interface ProductItem {
  itemId: string;
  productId: string;
  quantity: number;
  // Price before discounts.
  price?: number;
  // Price after discounts.
  priceAfterItemDiscount?: number;
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

// Main product id. Spec picks two in-stock sizes. overQuantity is impossibly large.
export const cart: CartFixture = {
  masterId: '25591139M',
  updatedQuantity: 3,
  overQuantity: 999999,
};

// Cart lines; empty cart → [].
export const lineItems = (basket: Basket): ProductItem[] => basket.productItems ?? [];

// First cart line, or fail clear.
export const firstLineItem = (basket: Basket): ProductItem => {
  const [item] = lineItems(basket);
  if (!item) throw new Error('expected at least one product item in the basket');
  return item;
};

// Cart subtotal (-1 if missing so tests fail).
export const subtotal = (basket: Basket): number => basket.productSubTotal ?? -1;

// Sum after discounts (matches basket subtotal on sale items).
export const lineItemsTotal = (items: ProductItem[]): number =>
  items.reduce((sum, item) => sum + (item.priceAfterItemDiscount ?? item.price ?? 0), 0);
